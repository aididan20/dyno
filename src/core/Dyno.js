'use strict';

global.Promise = require('bluebird');

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Eris = require('@dyno.gg/eris');
const { utils } = require('@dyno.gg/dyno-core');
const dot = require('dot-object');
const each = require('async-each');
const StatsD = require('hot-shots');
const moment = require('moment');
const uuid = require('uuid/v4');
const config = require('./config');
const logger = require('./logger');
const redis = require('./redis');
const db = require('./database');
const PermissionsManager = require('./managers/PermissionsManager');
const CommandCollection = require('./collections/CommandCollection');
const ModuleCollection = require('./collections/ModuleCollection');
const GuildCollection = require('./collections/GuildCollection');
const WebhookManager = require('./managers/WebhookManager');
const EventManager = require('./managers/EventManager');
const IPCManager = require('./managers/IPCManager');
const RPCServer = require('./RPCServer');
const RPCClient = require('./RPCClient');
const { Client } = require('./rpc');
const prom = require('prom-client');


var EventEmitter;

try {
	EventEmitter = require('eventemitter3');
} catch (e) {
	EventEmitter = require('events');
}

const redisLock = require('ioredis-lock');

var instance;

const statsdClient = new StatsD({
	host: config.statsd.host,
	port: config.statsd.port,
	prefix: config.statsd.prefix,
});

const premiumWebhook = 'https://canary.discordapp.com/api/webhooks/523575952744120321/xrh6uyOA0MOuMvHDAZLw5qws-jr9cDELU6xOoXZSTZcLlwN7lMHxt6yQD-dqRmJuLnnB';

/**
 * @class Dyno
 */
class Dyno {

	/**
	 * Dyno constructor
	 */
	constructor() {
		this.isReady = false;
		this.startTime = Date.now();
		this.uuid = uuid();

		instance = this; // eslint-disable-line

		Object.defineProperty(Eris.Message.prototype, 'guild', {
			get: function get() { return this.channel.guild; },
		});

		process.on('unhandledRejection', this.handleRejection.bind(this));
		process.on('uncaughtException', this.crashReport.bind(this));

		this.activityInterval = setInterval(this.uncacheGuilds.bind(this), 900000);
	}

	static get instance() {
		return instance;
	}

	/**
	 * Eris client instance
	 * @returns {Eris}
	 */
	get client() {
		return this._client;
	}

	/**
	 * Eris rest client instance
	 * @return {Eris}
	 */
	get restClient() {
		return this._restClient;
	}

	/**
	 * Dyno configuration
	 * @returns {Object}
	 */
	get config() {
		return config;
	}

	/**
	 * Global configuration
	 * @return {Object}
	 */
	get globalConfig() {
		return this._globalConfig;
	}

	get logger() {
		return logger;
	}

	get db() {
		return db;
	}

	get models() {
		return db.models;
	}

	get redis() {
		return this._redis;
	}

	get statsd() {
		return statsdClient;
	}

	get utils() {
		return utils;
	}

	get prefix() {
		return (config.prefix != undefined && typeof config.prefix === 'string') ? config.prefix : '?';
	}

	get prom() {
		return prom;
	}

	handleError(err) {
		if (!err || (typeof err === 'string' && !err.length)) {
			return logger.error('An undefined exception occurred.');
		}

		try {
			logger.error(err);
		} catch (e) {
			console.error(err); // eslint-disable-line
		}
	}

	/**
	 * Unhandled rejection handler
	 * @param {Error|*} reason The reason the promise was rejected
	 * @param {Promise} p The promise that was rejected
	 */
	handleRejection(reason, p) {
		try {
			console.error('Unhandled rejection at: Promise ', p, 'reason: ', reason); // eslint-disable-line
		} catch (err) {
			console.error(reason); // eslint-disable-line
		}
	}

	crashReport(err) {
		const cid = `C${this.clientOptions.clusterId}`;
		const time = (new Date()).toISOString();
		let report = `Crash Report [${cid}] ${time}:\n\n${err.stack}`;

		report += `\n\nClient Options: ${JSON.stringify(this.clientOptions)}`;

		for (let module of this.modules.values()) {
			if (module.crashReport) {
				report += `\n\n${module.crashReport()}`;
			}
		}

		const file = path.join(__dirname, `crashreport_${cid}_${time}.txt`);
		fs.writeFileSync(file, report);

		setTimeout(() => process.exit(), 6000);
	}

	range(start, end) {
		return (new Array(end - start + 1)).fill(undefined).map((_, i) => i + start);
	}

	/**
	 * Setup Dyno and login
	 */
	async setup(options, rootContext) {
		options = options || {};

		await this.configure(options);

		options.restClient = { restMode: true };

		this.options = Object.assign({}, { rootCtx: rootContext }, options);
		this.clientOptions = options;

		this.shards = this.range(options.firstShardId, options.lastShardId);

		//connect to redis
		try {
			this._redis = await redis.connect();
		} catch (err) {
			logger.error(err);
		}

		const pipeline = this.redis.pipeline();

		for (let shard of this.shards) {
			pipeline.hgetall(`guild_activity:${config.client.id}:${options.shardCount}:${shard}`);
		}

		let results = await pipeline.exec();

		results = results.map(r => {
			let [err, res] = r;
			if (err) {
				return;
			}
			return res;
		}).filter(r => r != null);

		this._guildActivity = Object.assign(...results);

		// create the discord client
		const token = this.config.isPremium ? config.client.token : this.globalConfig.prodToken || config.client.token;

		this._client = new Eris(token, config.clientOptions);
		this._restClient = new Eris(`Bot ${token}`, options.restClient);

		this.client.on('error', err => logger.error(err));
		this.client.on('warn', err => logger.error(err));
		this.client.on('debug', msg => {
			if (typeof msg === 'string') {
				msg = msg.replace(config.client.token, 'potato');
			}
			logger.debug(`[Eris] ${msg}`);
		});

		if (!options.awaitReady) {
			this.client.once('shardReady', () => {
				this.isReady = true;
				this.user = this._client.user;
				this.userid = this._client.user.id;
			});
		}

		this.dispatcher = new EventManager(this);
		this.ipc = new IPCManager(this);
		this.internalEvents = new EventEmitter();

		// Create collections
		this.commands = new CommandCollection(config, this);
		this.modules  = new ModuleCollection(config, this);
		this.guilds   = new GuildCollection(config, this);

		// Create managers
		this.webhooks  = new WebhookManager(this);
		this.permissions = new PermissionsManager(this);

		// Create RPC Server
		this.rpcServer = new RPCServer(this);
		this.RPCClient = RPCClient;
		this.cmClient = new Client(config.rpcHost || 'localhost', 5052);

		// event listeners
		this.client.once('ready', this.ready.bind(this));
		this.client.on('error', this.handleError.bind(this));

		// login to discord
		this.login();

		this.readyTimeout = setTimeout(() => {
			try {
				this.ipc.send('ready');
			} catch (err) {
				logger.error(`IPC Error Caught:`, err);
			}
		}, 90000);
	}

	async configure(options) {
		await this.loadConfig().catch(() => null);
		this.watchGlobal();

		const clientConfig = {
			disableEvents: {
				TYPING_START: true,
			},
			disableEveryone: config.client.disableEveryone,
			getAllUsers: config.client.fetchAllUsers || false,
			firstShardID: options.firstShardId || options.clusterId || options.shardId || 0,
			lastShardID: options.lastShardId || options.clusterId || options.shardId || 0,
			maxShards: options.shardCount || 1,
			messageLimit: parseInt(config.client.maxCachedMessages) || 10,
			guildCreateTimeout: 2000,
			largeThreshold: 50,
			defaultImageFormat: 'png',
			preIdentify: this.preIdentify.bind(this),
			intents: config.client.intents || undefined,
		};

		if (!this.config.isPremium && !config.test) {
			// if ((options.clusterId % 2) > 0) {
			// 	clientConfig.compress = true;
			// }

			if (!this.globalConfig.disableGuildActivity) {
				clientConfig.disableEvents.PRESENCE_UPDATE = true;
				clientConfig.createGuild = this.createGuild.bind(this);
			}
		}

		if (config.disableEvents) {
			for (let event of config.disableEvents) {
				clientConfig.disableEvents[event] = true;
			}
		}

		config.clientOptions = clientConfig;

		await this.loadConfig().catch(() => null);
		await this.watchGlobal();
		
		return clientConfig;
	}

	async watchGlobal() {
		await this.updateGlobal();

		this._globalConfigInterval = setInterval(() => this.updateGlobal(), 2 * 60 * 1000);
	}

	async loadConfig() {
		try {
			if (this.models.Config != undefined) {
				const dbConfig = await this.models.Config.findOne({ clientId: config.client.id }).lean();
				if (dbConfig) {
					config = Object.assign(config, dbConfig);
				}
			}
			const globalConfig = await this.models.Dyno.findOne().lean();
			this._globalConfig = config.global = globalConfig;
		} catch (err) {
			this.logger.error(err);
		}
	}

	async updateGlobal() {
		try {
			const globalConfig = await this.models.Dyno.findOne().lean();
			if (globalConfig) {
				this._globalConfig = config.global = globalConfig;
			}
		} catch (err) {
			logger.error(err, 'globalConfigRefresh');
		}
	}

	updateStatus(status) {
		this.playingStatus = status;
		this.client.editStatus('online', { name: this.playingStatus, type: 0 });
	}

	/**
	 * Login to Discord
	 * @returns {*}
	 */
	login() {
		// connect to discord
		this.client.connect();

		return false;
	}

	preIdentify(id) {
		let bucket, key, timeout;

		if (config.isPremium && !config.test) {
			timeout = 5250;
			key = `shard:identify:${config.client.id}`;
		} else {
			bucket = id % 16;
			timeout = 7500;
			key = `shard:identify:${config.client.id}:${bucket}`;
		}

		const lock = redisLock.createLock(this.redis, {
			timeout: timeout,
			retries: Number.MAX_SAFE_INTEGER,
			delay: 50,
		});

		return new Promise((resolve, reject) => {
			lock.acquire(key).then(() => {
				if (id) {
					logger.debug(`Acquired lock on ${id}`);
				}

				return resolve();

				// this.client.getBotGateway().then(data => {
				// 	const sessionLimit = data.session_start_limit;
				// 	if (sessionLimit.remaining <= 5) {
				// 		this.alertSessionLimit();
				// 		return reject(`Session limit dangerously low.`);
				// 	}

				// 	return resolve();
				// });
			});
		});
	}

	createGuild(_guild) {
		let lastActive = this._guildActivity[_guild.id];

		if (lastActive) {
			lastActive = parseInt(lastActive, 10);
			_guild.lastActive = lastActive;
			let diff = (Date.now() - lastActive);
			let min = (60 * 60 * 24 * 1 * 1000); // 1 days

			delete this._guildActivity[_guild.id];

			if (diff > min) {
				_guild.inactive = true;
				return this.client.guilds.add(_guild, this.client, true);
			}
		}

		let guild = this.client.guilds.add(_guild, this.client, true);

		if (config.clientOptions.getAllUsers && guild.members.size < guild.memberCount) {
			guild.fetchAllMembers();
		}

		return guild;
	}

	uncacheGuilds() {
		const guilds = this.client.guilds.filter(g => !g.inactive);
		for (let guild of guilds) {
			const diff = (Date.now() - guild.lastActive);
			const min = (60 * 60 * 24 * 1 * 1000); // 1 days

			if (diff > min) {
				let _guild = {
					id: guild.id,
					unavailable: guild.unavailable,
					member_count: guild.memberCount,
					lastActive: guild.lastActive,
					inactive: true,
				};
				this.client.guilds.add(_guild, this.client, true);
			}
		}
	}

	alertSessionLimit() {
		const lock = redisLock.createLock(redis, {
			timeout: 60000,
			retries: 0,
			delay: 250,
		});

		lock.acquire(`alerts:session:${config.client.id}`).then(() => {
			this.restClient.executeWebhook('482709011356057631', 'oLrn3NnEg2cL-7cM6mFrvgdTPoCMx-unh8k2YwlEIkcZnXeOy54-QKZpOMUkPZ527x7X', {
				embeds: [{
					color: 15607824,
					title: `Danger`,
					description: `**Dyno is dangerously close to token reset. Some shards may be offline. Let someone know.**`,
					timestamp: (new Date()).toISOString(),
				}],
			}).catch(() => null);
		}).catch(() => null);
	}

	/**
	 * Ready event handler
	 */
	ready() {
		logger.info(`[Dyno] ${this.config.name} ready with ${this.client.guilds.size} guilds.`);

		// register discord event listeners
		this.dispatcher.bindListeners();

		clearTimeout(this.readyTimeout);
		try {
			this.ipc.send('ready');
		} catch (err) {
			logger.error(`IPC Error Caught:`, err);
		}

		this.user = this._client.user;
		this.userid = this._client.user.id;

		this.isReady = true;

		if (this.globalConfig.playingStatus) {
			this.playingStatus = this.globalConfig.playingStatus[this.config.client.id] ||
					     this.globalConfig.playingStatus.default ||
					     this.config.client.game;
			this.client.editStatus('online', { name: this.playingStatus, type: 0 });
		} else if (this.config.client.game) {
			this.client.editStatus('online', { name: this.config.client.game, type: 0 });
		}

		if (this.config.isPremium) {
			this.leaveInterval = setInterval(this.leaveGuilds.bind(this), 300000);
			this.leaveGuilds();
		}
	}

	async leaveGuilds() {
		try {
			var docs = await this.models.Server.find({ deleted: false, isPremium: true }, { _id: 1, isPremium: 1, premiumInstalled: 1 }).lean().exec();
		} catch (err) {
			return logger.error(err);
		}

		each([...this.client.guilds.values()], guild => {
			let guildConfig = docs.find(d => d._id === guild.id);
			if (!guildConfig || !guildConfig.isPremium) {
				this.verifyAndLeave(guild.id);
//				this.guilds.update(guild.id, { $set: { premiumInstalled: false } }).catch(err => false);
//				this.client.leaveGuild(guild.id);
			}
		});
	}

	async verifyAndLeave(guildId) {
		try {
			const doc = await this.models.Server.findOne({ _id: guildId }).lean();
			if (!doc) {
				this.postWebhook(premiumWebhook, { embeds: [{ title: 'Premium Verification Failed', description: `No guild config was returned: ${guildId}`, color: 16729871 }] });
				return logger.error(`Premium verification failed: No guild config was returned. ${guildId}`);
			}

			if (doc.isPremium) {
				this.postWebhook(premiumWebhook, { embeds: [{ title: 'Premium Verification Failed', description: `Guild is premium but was scheduled to leave: ${guildId}`, color: 16729871 }] });
				return logger.error(`Premium verification failed: Guild is premium, but was flagged for deletion. ${guildId}`);
			}

			this.postWebhook(premiumWebhook, { embeds: [{ title: 'Premium Verification Passed', description: `Leaving Guild ${guildId}` }], color: 2347360 });
			this.guilds.update(guildId, { $set: { premiumInstalled: false } }).catch(err => false);
			this.client.leaveGuild(guildId);
		} catch (err) {
			logger.error(err);
		}
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

module.exports = Dyno;
