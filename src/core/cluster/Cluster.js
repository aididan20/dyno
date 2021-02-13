'use strict';

const cluster = require('cluster');

var EventEmitter;

try {
	EventEmitter = require('eventemitter3');
} catch (e) {
	EventEmitter = require('events');
}

/**
 * @class Cluster
 * @extends {EventEmitter}
 */
class Cluster extends EventEmitter {
	/**
	 * Representation of a cluster
	 *
	 * @param {Number} id Cluster ID
	 * @prop {Number} [options.shardCount] Shard count
	 * @prop {Number} [options.firstShardId] Optional first shard ID
	 * @prop {Number} [options.lastShardId] Optional last shard ID
	 * @prop {Number} [options.clusterCount] Optional cluster count
	 *
	 * @prop {Number} id Cluster ID
	 * @prop {Object} worker The worker
	 * @prop {Object} process The worker process
	 * @prop {Number} pid The worker process ID
	 */
	constructor(manager, options) {
		super();

		this.id = options.id;
		this.options = options;
		this.shardCount = options.shardCount;
		this.firstShardId = options.firstShardId;
		this.lastShardId = options.lastShardId;
		this.clusterCount = options.clusterCount;

		this.worker = this.createWorker();
		this.process = this.worker.process;
		this.pid = this.process.pid;
	}

	/**
	 * Create a cluster worker
	 * @return {Object} The worker process reference
	 */
	createWorker(awaitReady = false) {
		const worker = cluster.fork(
			Object.assign({
				awaitReady: awaitReady,
				clusterId: this.id,
			}, this.options)
		);

		this._pid = worker.process.pid;

		process.nextTick(() => {
			this._readyListener = this.ready.bind(this);
			this._shardReadyListener = this.shardReady.bind(this);

			worker.on('message', this._readyListener);
			worker.on('message', this._shardReadyListener);
		});

		return worker;
	}

	/**
	 * Restart a cluster worker
	 */
	restartWorker(awaitReady = false) {
		const worker = this.createWorker(awaitReady);
		const oldWorker = this.worker;
		this._pid = worker.process.pid;

		return new Promise(resolve => {
			this.on('ready', () => {
				if (this.worker) {
					oldWorker.kill('SIGTERM');
				}

				process.nextTick(() => {
					this.worker = worker;
					this.process = worker.process;
					this.pid = worker.pid;
					// this.worker.removeListener('ready', this._readyListener);
					this.worker.removeListener('shardReady', this._shardReadyListener);

					return resolve();
				});
			});
		});
	}

	/**
	 * Listen for cluster ready event
	 * @param {String|Object} message Message received from the worker
	 */
	ready(message) {
		if (!message || !message.op) return;
		if (message.op === 'ready') {
			this.emit('ready');
		}
	}

	/**
	 * Listen for shard ready event
	 * @param {String|Object} message Message received from the worker
	 */
	shardReady(message) {
		if (!message || !message.op) return;
		if (message.op === 'shardReady') {
			this.emit('shardReady', message.d);
		}
	}

	/**
	 * Send a command to the shard and await a response
	 * @param {Object} message The message to send
	 * @returns {Promise}
	 */
	awaitResponse(message) {
		return new Promise((resolve) => {
			const awaitListener = (msg) => {
				if (!['resp', 'error'].includes(msg.op)) return;
				this.worker.removeListener('message', awaitListener);
				return resolve({ id: this.id, result: msg.d });
			};

			this.worker.on('message', awaitListener);
			this.worker.send(message);

			setTimeout(() => {
				this.worker.removeListener('message', awaitListener);
				return resolve({ id: this.id, error: 'IPC request timed out.' });
			}, 2000);
		});
	}
}

module.exports = Cluster;
