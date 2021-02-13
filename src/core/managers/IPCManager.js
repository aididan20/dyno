'use strict';

const { utils } = require('@dyno.gg/dyno-core');
const EventEmitter = require('eventemitter3');
const each = require('async-each');
const logger = require('../logger');

/**
 * @class IPCManager
 * @extends EventEmitter
 */
class IPCManager extends EventEmitter {
	/**
	 * Manages the IPC communications with the shard manager
	 * @param {Dyno} dyno The Dyno instance
	 *
	 * @prop {Number} id Shard ID
	 * @prop {Number} pid Process ID
	 * @prop {Map} commands Collection of IPC commands
	 */
	constructor(dyno) {
		super();

		const config = this._config = dyno.config;

		this.dyno = dyno;
		this.client = dyno.client;

		this.id = dyno.clientOptions.clusterId || dyno.clientOptions.shardId || 0;
		this.pid = process.pid;
		this.commands = new Map();

		process.on('message', this.onMessage.bind(this));

		utils.readdirRecursive(this._config.paths.ipc).then(files => {
			each(files, (file, next) => {
				if (file.endsWith('.map')) return next();
				this.register(require(file));
				return next();
			}, err => {
				if (err) logger.error(err);
				logger.info(`[IPCManager] Registered ${this.commands.size} IPC commands.`);
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
		try {
			process.send({
				op: event,
				d: data || null,
			});
		} catch (err) {
			logger.error(`IPC Error Caught:`, err);
		}
	}

	/**
	 * Fired when the shard receives a message
	 * @param {Object} message The message object
	 * @returns {*}
	 */
	onMessage(message) {
		// op for internal dyno messages, type for prom-client cluster messages
		if (!message.op && !message.type) {
			return logger.warn('Received IPC message with no op or type.');
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
			return command(this.dyno, this._config, message);
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
			try {
				process.send(payload);
			} catch (err) {
				logger.error(`IPC Error Caught:`, err);
			}

			setTimeout(() => {
				process.removeListener('message', awaitListener);
				reject('IPC Timed out.');
			}, 5000);
		});
	}

	/**
	 * Register an IPC command
	 * @param {Function} command The command to execute
	 * @returns {*|void}
	 */
	register(command) {
		if (!command || !command.name) return logger.error('[IPCManager] Invalid command.');
		logger.debug(`[IPCManager] Registering ipc command ${command.name}`);
		this.commands.set(command.name, command);
	}
}

module.exports = IPCManager;
