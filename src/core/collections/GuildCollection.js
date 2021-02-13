'use strict';

const dot = require('dot-object');
const each = require('async-each');
const { Collection, utils } = require('@dyno.gg/dyno-core');
const { models } = require('../../core/database');
const redis = require('../../core/redis');
const logger = require('../logger');

const premiumWebhook = 'https://canary.discordapp.com/api/webhooks/523575952744120321/xrh6uyOA0MOuMvHDAZLw5qws-jr9cDELU6xOoXZSTZcLlwN7lMHxt6yQD-dqRmJuLnnB';

/**
 * @class GuildCollection
 * @extends Collection
 */
class GuildCollection extends Collection {
	/**
	 * A collection of guild configurations
	 * @param {Object} config The Dyno configuration object
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor(config, dyno) {
		super();

		this.dyno = dyno;
		this.client = dyno.client;
		this.config = config;
		this._registering = new Set();
		this._activeThreshold = 3600 * 1000; // 24 hrs

		dyno.dispatcher.registerListener('guildCreate', this.guildCreated.bind(this));
		dyno.dispatcher.registerListener('guildDelete', this.guildDeleted.bind(this));

		this.createWatch();

		setInterval(this.uncacheData.bind(this), 150000);
	}

	get globalConfig() {
		return this.dyno.globalConfig;
	}

	async createWatch() {
		// We need an exclusive connection for publish / subscribe
		this.subRedis = await redis.connect();

		await this.subRedis.subscribe('guildConfig');

		this.subRedis.on('message', (channel, message) => {
			if (channel === 'guildConfig') {
				this.guildUpdate(message);
			}
		});
	}

	guildUpdate(id) {
		if (!this.client.guilds.has(id) || !this.has(id)) {
			return;
		}

		this.fetch(id).catch(err => logger.error(err));
	}

	/**
	 * Uncache guild configs
	 */
	uncacheData() {
		each([...this.values()], guild => {
			if ((Date.now() - guild.cachedAt) > 900) {
				this.delete(guild._id);
			}
		});
	}

	/**
	 * Get or fetch a guild, no async/await for performance reasons
	 * @param {String} id Guild ID
	 * @returns {Promise}
	 */
	getOrFetch(id) {
		const doc = this.get(id);
		if (doc) {
			doc.cachedAt = Date.now();
			return Promise.resolve(doc);
		}

		return this.fetch(id).then(doc => {
			if (!doc) {
				return this.registerGuild(this.client.guilds.get(id));
			}

			doc.cachedAt = Date.now();
			this.set(doc._id, doc);

			return doc;
		});
	}

	/**
	 * Fetch a guild from the database
	 * @param {String} id Guild ID
	 * @returns {Promise}
	 */
	fetch(id) {
		let updateKeys = ['name', 'region', 'iconURL', 'ownerID', 'memberCount'];
		return new Promise((resolve, reject) => {
			models.Server.findAndPopulate(id)
				.then(doc => {
					if (!doc) {
						return resolve();
					}

					doc = doc.toObject();
					let update = false;

					if (this.client.guilds.has(id)) {
						const guild = this.client.guilds.get(id);

						if (!doc.longId) {
							update = update || {};
							update.longId = guild.id;
						}

						for (let key of updateKeys) {
							if (guild[key] && doc[key] !== guild[key]) {
								update = update || {};
								update[key] = guild[key];
								doc[key] = guild[key];
							}
						}

						if (doc.deleted === true) {
							update = update || {};
							update.deleted = false;
						}

						if (!doc.clientID || doc.clientID !== this.config.client.id) {
							if ((this.config.isPremium && doc.isPremium) || (!this.config.isPremium && !doc.isPremium)) {
								update = update || {};
								update.clientID = this.config.client.id;
							}
						}

						if (!doc.lastActive || (Date.now() - doc.lastActive) > this._activeThreshold) {
							update = update || {};
							update.lastActive = Date.now();
							this.setActive(guild, update.lastActive);
						}

						if (update) {
							this.update(id, { $set: update }).catch(err => logger.error(err));
						}
					}

					this.set(doc._id, doc);
					return resolve(doc);
				})
				.catch(err => reject(err));
		});
	}

	/**
	 * Fired when a web update is received
	 * @param {String} id Guild ID
	 */
	// guildUpdate(id) {
	// 	const guild = this.client.guilds.get(id);
	// 	if (!guild) return;

	// 	logger.debug(`Web update for guild: ${id}`);

	// 	this.fetch(id).catch(err => logger.error(err));
	// }

	/**
	 * Wrapper to update guild config
	 * @param {String} id Guild ID
	 * @param {Object} update Mongoose update query
	 * @param {...*} args Any additional arguments to pass to the model
	 * @returns {Promise}
	 */
	update(id, update, ...args) {
		if (update.$set) {
			const serverlistColl = this.dyno.db.collection('serverlist_store');
			let serverlistUpdate = false;
			if (update.$set.iconURL) {
				serverlistUpdate = serverlistUpdate || {};
				serverlistUpdate.iconURL = update.$set.iconURL;
			}

			if (update.$set.deleted === true) {
				serverlistUpdate = serverlistUpdate || {};
				serverlistUpdate.markedForDeletionAt = Date.now();
			}

			if (update.$set.name) {
				serverlistUpdate = serverlistUpdate || {};
				serverlistUpdate.name = update.$set.name;
			}

			if (update.$set.memberCount) {
				serverlistUpdate = serverlistUpdate || {};
				serverlistUpdate.memberCount = update.$set.memberCount;
			}

			if (serverlistUpdate) {
				serverlistColl.update({ id }, { $set: serverlistUpdate });
			}

			if (update.$set.deleted === false) {
				serverlistColl.update({ id }, { $unset: { markedForDeletionAt: 1 } });
			}
		}

		try {
			const result = models.Server.update({ _id: id }, update, ...args);
			this.dyno.redis.publish('guildConfig', id);
			return result;
		} catch (err) {
			logger.error(err);
		}
	}

	// getGlobal() {
	// 	if (this._globalConfig) return Promise.resolve(this._globalConfig);
	// 	return Dyno.findOne().lean().exec();
	// }

	/**
	 * Guild created event listener
	 * @param {Guild} guild Guild object
	 */
	async guildCreated(guild) {
		// if (this.config.handleRegion && !utils.regionEnabled(guild, this.config) && guild.id !== this.config.dynoGuild) {
		// 	return this.client.uncacheGuild(guild.id);
		// }

		logger.info(`Connected to server: ${guild.id} with ${guild.channels.size} channels and ${guild.members.size} members | ${guild.name}`);

		try {
			var doc = await models.Server.findOne({ _id: guild.id }).lean().exec();
			if (!doc) {
				return this.registerGuild(guild, true);
			}

			if (this.config.isPremium && !doc.isPremium) {
				this.postWebhook(premiumWebhook, { embeds: [{ title: 'Non-premium Guild Create', description: `Leaving Guild ${guild.id}`, color: 16729871 }] });
				return this.client.leaveGuild(guild.id);
			}

			await this.update(guild.id, { $set: { deleted: false } }, { multi: true });
			this.set(doc._id, doc);
		} catch (err) {
			return logger.error(err);
		}

		if (this.config.isPremium && !doc.premiumInstalled) {
			doc.premiumInstalled = true;
			this.set(doc._id, doc);
			this.update(doc._id, { $set: { premiumInstalled: true } }).catch(err => logger.error(err));
		}

		return false;
	}

	/**
	 * Guild deleted event listener
	 * @param  {Guild} guild Guild object
	 */
	async guildDeleted(guild) {
		if (guild.unavailable) return;

		if (this.config.isPremium) {
			var guildConfig = await this.getOrFetch(guild.id);
			if (!guildConfig || !guildConfig.isPremium) return;
			if (guildConfig.isPremium && guildConfig.premiumInstalled) {
				return this.update(guild.id, { $set: { premiumInstalled: false } }).catch(() => false);
			}

			return;
		}

		this.update(guild.id, { $set: { deleted: true, deletedAt: new Date() } })
			.catch(err => logger.error(err));
	}

	/**
	 * Register server in the database
	 * @param  {Guild} guild Guild object
	 */
	registerGuild(guild, newGuild) {
		if (!guild || !guild.id) {
			return;
		}

		if (this._registering.has(guild.id)) {
			return;
		}

		this._registering.add(guild.id);

		let doc = {
			_id: guild.id,
			longId: guild.id,
			clientID: this.config.clientID,
			name: guild.name,
			iconURL: guild.iconURL,
			ownerID: guild.ownerID,
			memberCount: guild.memberCount,
			region: guild.region || null,
			modules: {},
			commands: {},
			lastActive: Date.now(),
			deleted: false,
		};

		logger.info(`Registering guild: ${guild.id} ${guild.name}`);

		if (newGuild && !this.config.isPremium) {
			this.dmOwner(guild);
		}

		return new Promise((resolve, reject) => {
			// add modules
			for (let mod of this.dyno.modules.values()) {
				// ignore core modules or modules that shouldn't be listed
				if (mod.core && (mod.hasOwnProperty('list') && mod.list === false)) continue;
				doc.modules[mod.module] = mod.enabled;
			}

			for (let cmd of this.dyno.commands.values()) {
				if (cmd.permissions === 'admin') continue;

				// ignore commands that belong to a module
				if (this.dyno.modules.find(o => o.module === cmd.group) && doc.modules[cmd.group] === false) {
					doc.commands[cmd.name] = false;
					continue;
				}
				doc.commands[cmd.name] = (cmd.enabled || !cmd.disabled);
			}

			this.update(doc._id, doc, { upsert: true })
				.then(() => {
					doc.cachedAt = Date.now();

					this.set(guild.id, doc);
					return resolve(doc);
				})
				.catch(err => {
					logger.error(err);
					return reject(err);
				})
				.then(() => this._registering.delete(guild.id));
		});
	}

	setActive(guild, time) {
		guild.lastActive = time;
		this.dyno.redis.hset(`guild_activity:${this.config.client.id}:${this.config.clientOptions.maxShards}:${guild.shard.id}`, guild.id, time)
			.catch(() => null);
	}

	/**
	 * Attempt to send a DM to guild owner
	 * @param {Guild} guild Guild object
	 * @param {String} content Message to send
	 * @returns {Promise}
	 */
	async sendDM(guild, content) {
		try {
			var channel = await this.client.getDMChannel(guild.ownerID);
		} catch (err) {
			logger.error(err);
			return Promise.reject(err);
		}

		if (!channel) {
			return Promise.reject('Channel is undefined or null.');
		}

		this.client.createMessage(channel, content).catch(() => false);
	}

	/**
	 * DM Guild owner
	 * @param {Guild} guild Guild
	 */
	dmOwner(guild) {
		if (this.config.test || this.config.beta) return;
		if (this.config.handleRegion && !utils.regionEnabled(guild, this.config)) return;

		let msgArray = [];

		msgArray.push(`Thanks for adding me to your server. Just a few things to note.`);
		msgArray.push('**1.** The default prefix is **`?`**.');
		msgArray.push('**2.** Setup the bot at **https://www.dynobot.net**');
		msgArray.push('**3.** Commands do not work in DM.');
		msgArray.push(`**4.** Join the Dyno discord server for questions, suggestions, or updates. **https://www.dynobot.net/discord**`);

		const content = msgArray.join('\n');

		this.sendDM(guild, content)
			.then(() => logger.debug('Successful DM to owner'))
			.catch(() => {
				if (guild.memberCount > 70) return;
				this.client.createMessage(guild.defaultChannel, msgArray.join('\n'));
			});
	}

	postWebhook(webhook, payload) {
		return new Promise((resolve, reject) =>
			axios.post(webhook, {
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				...payload,
			})
			.then(resolve)
			.catch(reject));
	}
}

module.exports = GuildCollection;
