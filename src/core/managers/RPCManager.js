'use strict';

const { utils } = require('@dyno.gg/dyno-core');
const Hemera = require('nats-hemera');
const HemeraJoi = require('hemera-joi');
const Nats = require('nats');
const EventEmitter = require('eventemitter3');
const each = require('async-each');
const logger = require('../logger');

/**
 * @class RPCManager
 * @extends EventEmitter
 */
class RPCManager extends EventEmitter {
	/**
	 * Manages RPC communications
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor(dyno) {
		super();

		this.dyno = dyno;
		this.config = dyno.config;
		this.client = dyno.client;
		this.clusterConfig = dyno.clientOptions;

		this.id = dyno.options.clusterId || dyno.options.shardId || 0;
		this.pid = process.pid;

		this.commands = new Map();

		this.nats = Nats.connect({ url: 'nats://ares.dyno.gg:4222' });
		this.hemera = new Hemera(this.nats, { logLevel: 'info' });
		this.hemera.use(HemeraJoi);
		this.hemera.ready(this.onReady.bind(this));
	}

	onReady() {
		logger.info(`[RPCManager] ready.`);
		utils.readdirRecursive(this.config.paths.ipc).then(files => {
			each(files, (file, next) => {
				if (file.endsWith('.map')) return next();
				this.register(require(file));
				return next();
			}, err => {
				if (err) logger.error(err);
				logger.info(`[RPCManager] Registered ${this.commands.size} RPC commands.`);
			});
		}).catch(err => logger.error(err));
	}

	/**
	 * Send a command or event to the shard manager
	 * @param {String} event Event to send
	 * @param {Mixed} data The data to send
	 */
	send(event, data) {
		if (!process.send) return;
		process.send({
			op: event,
			d: data || null,
		});
	}

	/**
	 * Fired when the shard receives a message
	 * @param {Object} message The message object
	 * @returns {*}
	 */
	onMessage(message) {
		if (!message.op) {
			return logger.warn('Received RPC message with no op.');
		}

		if (['resp', 'broadcast'].includes(message.op)) return;

		if (this[message.op]) {
			try {
				return this[message.op](message);
			} catch (err) {
				return this.logger.error(err);
			}
		}

		const command = this.commands.get(message.op);

		if (!command) return;

		try {
			return command(this.dyno, this.config, message);
		} catch (err) {
			this.logger.error(err);
		}

		this.emit(message.op, message.d);
	}

	/**
	 * Send a command and await a response from the shard manager
	 * @param {String} op Op to send
	 * @param {Object} d The data to send
	 * @returns {Promise}
	 */
	awaitResponse(op, d) {
		if (!process.send) return;

		return new Promise((resolve, reject) => {
			const awaitListener = (msg) => {
				if (!['resp', 'error'].includes(msg.op)) return;

				process.removeListener('message', awaitListener);

				if (msg.op === 'resp') return resolve(msg.d);
				if (msg.op === 'error') return reject(msg.d);
			};

			const payload = { op: op };
			if (d) payload.d = d;

			process.on('message', awaitListener);
			process.send(payload);

			setTimeout(() => {
				process.removeListener('message', awaitListener);
				reject('RPC Timed out.');
			}, 5000);
		});
	}

	/**
	 * Register an RPC command
	 * @param {Function} command The command to execute
	 * @returns {*|void}
	 */
	register(command) {
		if (!command || !command.name) { return; }

		logger.debug(`[RPCManager] Registering rpc command ${command.name}`);
		const cmd = command(this);
		cmd.pattern.topic = `dyno.bot`;
		// cmd.pattern.cmd = `${cmd.pattern.cmd}.${this.clusterConfig.clusterId}`;
		this.hemera.add(cmd.pattern, cmd.handler.bind(this));
	}
}

module.exports = RPCManager;
