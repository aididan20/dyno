'use strict';

const { Module } = require('@dyno.gg/dyno-core');
const { exec } = require('child_process');
const os = require('os');
const each = require('async-each');
const eris = require('@dyno.gg/eris');
const moment = require('moment');
const blocked = require('blocked');
const pidusage = require('pidusage');

require('moment-duration-format');

/**
 * Dyno module
 * @class Dyno
 * @extends Module
 */
class Dyno extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'Dyno';
		this.description = 'Dyno stats, guild, and dm logs.';
		this.enabled = false;
		this.admin = true;
		this.hasPartial = false;
	}

	static get name() {
		return 'Dyno';
	}

	get settings() {
		return {
			statsEnabled:  Boolean,
			logEnabled:    Boolean,
			dmEnabled:     Boolean,
			carbonEnabled: Boolean,
			automodEnabled:Boolean,
			channel:       String,
			message:       String,
			logChannel:    String,
			dmChannel:     String,
			lgChannel:     String,
			carbonMessage: String,
			carbonChannel: String,
			automodChannel:String,
		};
	}

	async start() {
		this.statMessage = null;
		this.carbonMessages = new Map();
		this.listeners = new Map();
		this.jobs = [];

		// create the cron job
		this.schedule('0,15,30,45 * * * * *', this.updateStats.bind(this));

		// remove cached docs
		this.schedule('0 0 * * * *', () => {
			if (this._docs) delete this._docs;
		});

		this.exceptionHandler = this.handleException.bind(this);

		let exceptionHandlers = process.listeners('uncaughtException');
		if (exceptionHandlers && exceptionHandlers.length) {
			process.removeListener('uncaughtException', exceptionHandlers[0]);
		}

		process.on('uncaughtException', this.exceptionHandler);

		this.commandSuccessListener = this.onCommandSuccess.bind(this);
		this.commandFailureListener = this.onCommandFailure.bind(this);

		this.dyno.commands.on('command', this.commandSuccessListener);
		this.dyno.commands.on('error', this.commandFailureListener);

		this._blocked = blocked(ms => {
			this.prom.register.getSingleMetric('dyno_app_node_blocked').inc();
		}, { threshold: 100 });

		this.guildCreateListener = this.onGuildCreate.bind(this);
		this.guildDeleteListener = this.onGuildDelete.bind(this);
		this.messageCreateListener = this.onMessage.bind(this);
		this.rawWSListener = this.onRawEvent.bind(this);

		this.client.on('guildCreate', this.guildCreateListener);
		this.client.on('guildDelete', this.guildDeleteListener);
		this.client.on('messageCreate', this.messageCreateListener);
		this.client.on('rawWS', this.rawWSListener);
	}

	unload() {
		for (const [event, listener] of this.listeners.entries()) {
			this.ipc.removeListener(event, listener);
		}

		this.dyno.commands.removeListener('command', this.commandSuccessListener);
		this.dyno.commands.removeListener('command', this.commandFailureListener);
		this.client.removeListener('guildCreate', this.guildCreateListener);
		this.client.removeListener('guildDelete', this.guildDeleteListener);
		this.client.removeListener('messageCreate', this.messageCreateListener);
		this.client.removeListener('rawWS', this.rawWSListener);

		process.removeListener('uncaughtException', this.exceptionHandler);

		clearInterval(this._blocked);
	}

	/**
	 * Uncaught exception handler
	 * @param {Object} err Error object
	 */
	handleException(err) {
		if (!err || (typeof err === 'string' && !err.length)) {
			return this.logger.error('An undefined exception occurred.');
		}

		let ignored = ['ECONNRESET', 'ENETUNREACH', 'ETIMEDOUT'];

		for (let key of ignored) {
			if (err && err.message && err.message.includes(key)) {
				return this.logger.error(err);
			}

			if (err && err.code && err.code === key) {
				return this.logger.error(err);
			}
		}

		try {
			this.logger.error(err);
		} catch (e) {
			console.error(err); // eslint-disable-line
		} finally {
			setTimeout(() => process.exit(1), 3000);
		}
	}

	/**
	 * Parse guild object to broadcast through IPC
	 * @param {Guild} guild Guild object
	 * @returns {{id: String, name: (String|null), memberCount: null, icon: null, iconURL: null, ownerID: null, shard: null}}
	 */
	parseGuild(guild) {
		return {
			id: guild.id,
			name: guild.name || null,
			memberCount: guild.memberCount || null,
			icon: guild.icon || null,
			iconURL: guild.iconURL || null,
			ownerID: guild.ownerID || null,
			shard: guild.shard ? guild.shard.id || null : null,
		};
	}

	/**
	 * Handle guild create event
	 * @param {Guild} guild Guild object
	 */
	onGuildCreate(guild) {
		this.logGuildEvent('Created', this.parseGuild(guild));
		this.prom.register.getSingleMetric('dyno_app_guild_events').inc({ type: 'create' });
	}

	/**
	 * Handle guild delete event
	 * @param {Guild} guild Guild object
	 */
	onGuildDelete(guild) {
		this.logGuildEvent('Deleted', this.parseGuild(guild));
		this.prom.register.getSingleMetric('dyno_app_guild_events').inc({ type: 'delete' });
	}

	/**
	 * Handle direct messages received
	 * @param {Message} message Message object
	 */
	// messageCreate({ message }) {
	// 	if (message.channel.guild || message.author.id === this.client.user.id) return;

	// 	this.ipc.send('broadcast', {
	// 		op: 'directMessage',
	// 		d: {
	// 			id: message.id,
	// 			author: {
	// 				id: message.author.id,
	// 				username: message.author.username,
	// 				discriminator: message.author.discriminator,
	// 				avatar: message.author.icon,
	// 				avatarURL: message.author.avatarURL,
	// 			},
	// 			content: message.content,
	// 		},
	// 	});
	// }

	onMessage() {
		this.prom.register.getSingleMetric('dyno_app_message_events').inc({ type: 'create' });
	}

	onRawEvent() {
		this._events = this._events || 0;
		this._events++;
	}

	onCommandSuccess({ command, time }) {
		this.prom.register.getSingleMetric('dyno_app_command_success').inc({ group: (command.group || command.module), name: command.name });
		this.prom.register.getSingleMetric('dyno_app_command_time').observe({ group: (command.group || command.module), name: command.name }, time);
	}

	onCommandFailure({ command, time }) {
		this.prom.register.getSingleMetric('dyno_app_command_error').inc({ group: (command.group || command.module), name: command.name });
		this.prom.register.getSingleMetric('dyno_app_command_time').observe({ group: (command.group || command.module), name: command.name }, time);
	}

	/**
	 * Set a message id in the database
	 * @param {String} key Setting key name
	 * @param {String} id Guild id
	 * @param {Message} msg Message object
	 * @returns {Promise}
	 */
	async setMessage(key, id, msg) {
		key = `dyno.${key}`;
		try {
			await this.dyno.guilds.update(id, { $set: { [key]: msg ? msg.id : null } });
			return Promise.resolve();
		} catch (e) {
			this.logger.error(e);
			return Promise.reject(e);
		}
	}

	/**
	 * Log an event to the dev/guild log
	 * @param {String} event Event to log
	 */
	async logEvent(event) {
		try {
			const docs = await this.getDocs();
			if (!docs || !docs.length) return;

			each(docs, async doc => {
				const guild = this.client.guilds.get(doc._id);

				if (!guild || !await this.isEnabled(guild, this)) return;
				if (!doc.dyno || !doc.dyno.logChannel || !doc.dyno.logEnabled) return;

				const channel = this.client.getChannel(doc.dyno.logChannel);

				this.sendMessage(channel, `[${moment().format('hh:mm:ss a')}] ${event}`);
			});
		} catch (err) {
			this.logger.error(err);
		}
	}

	/**
	 * Log a guild create/delete event
	 * @param {String} event Event to log
	 * @param {Guild} guild The guild for the logged event
	 * @returns {void}
	 */
	async logGuildEvent(event, guild) {
		if (!this.config.isCore) return;
		if (!guild || !guild.id || !guild.name) return;

		if (guild.memberCount && guild.memberCount >= 250) {
			const color = event === 'Created' ? 2347360 : 16729871;
			const memberText = guild.memberCount ? ` | ${guild.memberCount} members` : '';
			const shortName = guild.name.length >= 31 ? `${guild.name.substr(0, 28)}...` : guild.name;
			const message = {
				username: shortName,
				avatarURL: guild.iconURL,
				embeds: [{
					color: color,
					title: `Guild ${event}: ${guild.name}${memberText}`,
					url: `${this.config.site.host}/server/${guild.id}`,
					timestamp: new Date(),
					footer: {
						text: `${this.config.stateName} | Shard ${guild.shard} | ID: ${guild.id}`,
					},
				}],
			};

			if (!this.guildlogChannel) {
				this.guildlogChannel = await this.dyno.restClient.getRESTChannel('341532519306362881').catch(() => null);
			}

			if (this.guildlogChannel) {
				let guildConfig = await this.dyno.guilds.getOrFetch(guild.id);
				if (guildConfig) {
					this.sendWebhook(this.guildlogChannel, message, guildConfig);
				}
			}
		}

		const log = new this.models.GuildLog({
			id: guild.id,
			guild: guild,
			action: event,
		});

		try {
			log.save(err => err ? this.logger.error(err) : false);
		} catch (err) {
			this.logger.error(err);
		}
	}

	/**
	 * Log direct messages to a channel
	 * @param {Message} message Message object
	 * @returns {boolean}
	 */
	async logDirectMessage(message) {
		try {
			const docs = await this.getDocs();
			if (!docs) return false;

			each(docs, async doc => {
				const guild = this.client.guilds.get(doc._id);

				if (!await this.isEnabled(guild, this)) return;
				if (!doc.dyno || !doc.dyno.dmEnabled || !doc.dyno.dmChannel) return;

				const channel = this.client.getChannel(doc.dyno.dmChannel);

				const msgArray = [
					`[${moment().format('hh:mm:ss a')}] From: ${message.author.username}#${message.author.discriminator}`,
					'```' + message.content + '```',
				];

				this.sendMessage(channel, msgArray.join('\n'));
			});

			return true;
		} catch (err) {
			this.logger.error(err, { type: 'dyno.logDirectMessage' });
		}
	}

	getFFmpegs() {
		return new Promise((resolve) => {
			exec(`pgrep ffmpeg | wc -l | tr -d ' '`, (err, stdout, stderr) => {
				if (err || stderr) {
					return resolve(0);
				}

				return resolve(stdout);
			});
		});
	}

	getCpuUsage() {
		return new Promise((resolve) => {
			pidusage.stat(process.pid, (err, stat) => {
				if (err) return resolve();
				return resolve(stat.cpu.toFixed(2));
			});
		});
	}

	getDocs() {
		if (this._docs) return Promise.resolve(this._docs);

		return new Promise((resolve, reject) =>
			this.models.Server.find({ 'modules.Dyno': true }).lean().exec()
				.catch(reject)
				.then(docs => {
					this._docs = docs;
					resolve(docs);
				}));
	}

	createChannel(guild, name, type, reason) {
		return this.client.requestHandler.request('POST', `/guilds/${guild.id}/channels`, true, {
			name,
			type,
			reason,
		}).then((channel) => new eris.GuildChannel(channel));
	}

	/**
	 * Update bot/shard stats
	 */
	async updateStats() {
		let voiceConnections = this.client.voiceConnections.size || 0,
			playingConnections = [...this.client.voiceConnections.values()].filter(c => c.playing && !c.ended);

		let coredata = {
			id: this.dyno.clientOptions.clusterId,
			pid: process.pid,
			guilds: this.client.guilds.size,
			users: this.client.users.size,
			mem: process.memoryUsage(),
			uptime: process.uptime(),
			time: Date.now(),
			isPremium: this.config.isPremium || null,
			events: this._events,
		};

		const clusterId = this.dyno.clientOptions.clusterId.toString();
		const state = this.config.state;
		let status;

		try {
			const uptime = moment.duration(process.uptime(), 'seconds');
			const started = moment().subtract(process.uptime(), 'seconds').format('llll');

			status = {
				env: this.config.env,
				server: this.config.stateName,
				clusterId: clusterId,
				shardCount: this.client.shards.size,
				connectedCount: this.client.shards.filter(s => s.status === 'ready').length,
				guildCount: this.client.guilds.size,
				unavailableCount: this.client.unavailableGuilds.size,
				voiceConnections: voiceConnections,
				shards: [...this.client.shards.keys()],
				shardStatus: [...this.client.shards.values()].map(s => ({ id: s.id, status: s.status })),
				uptime: uptime.format('w [w] d [d], h [h], m [m], s [s]'),
				started: started,
			};

			this.redis.set(`dyno.status.${state}.${clusterId}`, JSON.stringify(status), 'EX', 90);
			this.redis.set(`dyno:status:${this.config.env}:${clusterId}`, JSON.stringify(status), 'EX', 90);
        } catch (err) {
			this.logger.error(err);
		}

		if (!this.dyno.isReady) return;

		let data = Object.assign({}, coredata, {
			voice: voiceConnections || 0,
			playing: playingConnections ? playingConnections.length : 0,
		});

		data.cpu = await this.getCpuUsage();

		this.prom.register.getSingleMetric('dyno_app_gateway_events').set(this._events);
		this._events = 0;

		this.prom.register.getSingleMetric('dyno_app_guild_count').set(data.guilds);
		this.prom.register.getSingleMetric('dyno_app_user_count').set(data.users);

		if (this.config.isCore) {
			try {
				await Promise.all([
					this.redis.hset(`dyno:guilds:${this.config.client.id}`, `${state}:${clusterId}`, this.client.guilds.size),
					this.redis.hset(`dyno:cstats:${this.config.client.id}`, `${state}:${clusterId}`, JSON.stringify(coredata)),
					]);
			} catch (err) {
				this.logger.error(err, { type: 'dyno.updateStats.coreStats' });
			}
		}

		try {
			await Promise.all([
				this.redis.hset(`dyno:vc`, `${state}:${clusterId}`, data.voice || 0),
				this.redis.hset(`dyno:stats:${state}`, clusterId || 0, JSON.stringify(data)),
				]);
		} catch (err) {
			this.logger.error(err, { type: 'dyno.updateStats.stats' });
		}

		if (this.dyno.clientOptions.clusterId !== 0) {
			return;
		}

		if (!this.statsGuild || !this.guildChannels) {
			let [guild, guildChannels] = await Promise.all([
				this.restClient.getRESTGuild(this.config.statsGuild).catch(() => false),
				this.restClient.getRESTGuildChannels(this.config.statsGuild).catch(() => false),
			]);
			this.statsGuild = guild;
			this.guildChannels = guildChannels;
		}

		if (!this.guildChannels || !this.guildChannels.size || !this.guildChannels.length) {
			return;
		}

		const channelName = `stats-${this.config.stateName.toLowerCase()}`;
		this.statsChannel = this.guildChannels.find(c => c.name.toLowerCase() === channelName);
		if (!this.statsChannel) {
			try {
				this.statsChannel = await this.createChannel(this.statsGuild, channelName);
				this.guildChannels = await this.restClient.getRESTGuildChannels(this.config.statsGuild).catch(() => false);
				// this.statsChannel = await this.client.createChannel(this.statsGuild.id, channelName);
			} catch (err) {
				return this.logger.error(err, { type: 'dyno.updateStats.createChannel' });
			}
		}

		if (!this.statsChannel) {
			return;
		}

		try {
			var [shards, vcs, ffmpegs] = Promise.all([
				this.redis.hgetall(`dyno:stats:${this.config.state}`),
				this.redis.hgetall(`dyno:vc`),
				this.getFFmpegs(),
			]);
		} catch (err) {};

		return this.sendStats(this.statsGuild, shards, vcs, ffmpegs);
	}

	/**
	 * Send bot/shard stats to discord
	 * @param {Array.<Object>} guilds Array of guild configs
	 */
	async sendStats(guild, shards, vcs, ffmpegs) {
		const data = {};

		function sum(key, data) {
			return data.reduce((a, b) => {
				a += parseInt(b[key]);
				return a;
			}, 0);
		}

		data.shards = [];
		for (const key in shards) {
			const shard = JSON.parse(shards[key]);
			data.shards.push(shard);
		}

		data.guilds = sum('guilds', data.shards);
		data.users = sum('users', data.shards);
		data.voice = sum('voice', data.shards);
		data.playing = sum('playing', data.shards);
		data.allConnections = [...Object.values(vcs)].reduce((a, b) => a + parseInt(b), 0);

		const embed = {
			author: {
				name: 'Dyno',
				icon_url: `${this.config.avatar}`,
			},
			fields: [
				{ name: 'Guilds', value: `${data.guilds.toString()}`, inline: true },
				{ name: 'Users', value: `${data.users.toString()}`, inline: true },
				{ name: 'Streams', value: `${data.playing}/${data.voice}`, inline: true },
				{ name: 'FFMPEGs', value: `${ffmpegs.toString()}`, inline: true },
				{ name: 'Load Avg', value: `${os.loadavg().map(n => n.toFixed(3)).join(', ')}`, inline: true },
				{ name: 'Free Mem', value: `${this.utils.formatBytes(os.freemem())} / ${this.utils.formatBytes(os.totalmem())}`, inline: true },
			],
			footer: {
				text: `${this.config.stateName} | Cluster ${this.dyno.clientOptions.clusterId.toString()}`,
			},
			timestamp: new Date(),
		};

		let description = [];

		for (const shard of data.shards) {
			const uptime = moment.duration(shard.uptime, 'seconds')
				.format('w[w] d[d], h[h], m[m], s[s]');

			if (data.shards.length > 25) {
				description.push(`\`C${this.utils.pad(shard.id, 2)} | ${this.utils.pad(shard.pid, 5)} | ${shard.guilds}g | ${this.utils.pad(shard.voice, 2)}vc | ${this.utils.pad(shard.cpu + '%', 6)} | ${this.utils.pad(this.utils.formatBytes(shard.mem.rss, 2), 9)} | ${uptime}\``);
			} else {
				embed.fields.push({
					name: `C${shard.id} | ${shard.pid} | ${shard.guilds} guilds | ${shard.voice} vc`,
					value: `${shard.cpu}%, ${this.utils.formatBytes(shard.mem.rss, 2)}, ${uptime}`,
					inline: false,
				});
			}
		}

		if (description.length) {
			const fields = this.utils.splitMessage(description, 1000);
			for (let field of fields) {
				embed.fields.push({ name: '\u200b', value: field });
			}
		}

		let message = this.statMessage;

		if (!message) {
			await this.client.getMessages(this.statsChannel.id, 10).then(messages => {
				if (!messages || !messages.length) return;

				let msg = messages.pop();
				if (!msg) return;

				this.statMessage = message = msg;
			}).catch(() => false);
		}

		if (!message) {
			this.client.createMessage(this.statsChannel.id, { embed }).then(msg => {
				this.statMessages = message = msg;
			}).catch(err => this.logger.error(err, { type: 'dyno.sendStats.sendMessage' }));
		}

		message.edit({ embed }).catch(err => this.logger.error(err, { type: 'dyno.sendStats.editMessage' }));
	}
}

module.exports = Dyno;
