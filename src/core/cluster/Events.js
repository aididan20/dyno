'use strict';

const cluster = require('cluster');
const logger = require('../logger');

/**
 * @class Events
 */
class Events {
	/**
	 * Events manager
	 * @param {Manager} manager Cluster Manager instance
	 */
	constructor(manager) {
		this.manager = manager;
		this.logger = manager.logger;
		this.clusters = manager.clusters;

		this.readyListener = this.onReady.bind(this);
		this.messageListener = this.onMessage.bind(this);
		this.exitHandler = this.manager.handleExit.bind(this.manager);
	}

	/**
	 * Remove event listeners on module unload
	 */
	unload() {
		cluster.removeListener('exit', this.exitHandler);
		cluster.removeListener('online', this.readyListener);
		cluster.removeListener('message', this.messageListener);
	}

	/**
	 * Create event listeners when modul is loaded
	 */
	register() {
		cluster.on('exit', this.exitHandler);
		cluster.on('online', this.readyListener);
		cluster.on('message', this.messageListener);
	}

	/**
	 * Fired when a worker goes online
	 * @param {Object} worker Worker process
	 */
	onReady(worker) {
		const cluster = this.manager.getCluster(worker);
		const meta = cluster.firstShardId ? `Shards ${cluster.firstShardId}-${cluster.lastShardId}` : `Shard ${cluster.id}`;
		logger.info(`[Events] Cluster ${cluster.id} online | ${meta}`);
	}

	/**
	 * Fired when the cluster receives a message
	 * @param {Object} worker Worker process
	 * @param {Object} message The message object
	 * @returns {void}
	 */
	onMessage(worker, message) {
		if (!message.op) return;

		// ignore responses
		if (message.op === 'resp') return;

		if (this[message.op]) {
			this[message.op](message);
		} else if (message.op !== 'ready') {
			this.awaitResponse(worker, message);
		}
	}

	/**
	 * Send a command to and await a response from the cluster
	 * @param {Object} worker Worker process
	 * @param {Object} message The message to send
	 * @returns {void}
	 */
	awaitResponse(worker, message) {
		const promises = [];

		for (const cluster of this.clusters.values()) {
			if (!cluster.worker || !cluster.worker.isConnected()) continue;
			promises.push(cluster.awaitResponse(message));
		}

		return new Promise((resolve, reject) => {
			Promise.all(promises).then(results => {
				if (worker != null && worker.send) {
					try {
						worker.send({ op: 'resp', d: results });
					} catch (err) {
						logger.error(err);
					}
				}
				return resolve(results);
			}).catch(err => {
				if (worker != null && worker.send) {
					try {
						worker.send({ op: 'error', d: err });
					} catch (err) {
						logger.error(err);
					}
				}
				return reject(err);
			});
		});
	}

	/**
	 * Send a command to a cluster
	 * @param {Number} clusterId Cluster ID
	 * @param {String|Object} message Message to send
	 * @return {Boolean}
	 */
	send(clusterId, message) {
		const cluster = this.clusters.get(clusterId);
		if (!cluster) {
			logger.warn(`[Events] Cluster ${clusterId} not found attempting to send.`);
			return;
		}
		if (!cluster.worker) {
			logger.warn(`[Events] Cluster ${clusterId} worker not connected.`);
			return;
		}

		cluster.worker.send(message);
		return true;
	}

	/**
	 * Broadcast a message to all clusters
	 * @param {Object} message The message to send
	 */
	broadcast(message) {
		if (message.op === 'broadcast') {
			message = message.d;
		}

		for (const cluster of this.clusters.values()) {
			if (!cluster.worker || !cluster.worker.isConnected()) {
				logger.warn(`[Events] Cluster ${cluster.id} worker not connected.`);
				continue;
			}
			cluster.worker.send(message);
		}
	}

	/**
	 * Restart a cluster or clusters sequentially
	 * @param {Object} message The message received
	 * @returns {*}
	 */
	async restart(message) {
		if (message.d !== undefined && message.d !== null && !isNaN(message.d)) {
			const cluster = this.clusters.get(parseInt(message.d));
			if (!cluster) return;

			return cluster.restartWorker(true);
		} else {
			for (const cluster of this.clusters.values()) {
				cluster.restartWorker(true);
				await this.manager.awaitReady(cluster);
			}
		}
	}

	blocked(message) {
		this.logger.blocked.push(message.d);
	}

	shardDisconnect(message) {
		let msg = `[Events] Shard ${message.d.id} disconnected.`;
		if (message.d.err) {
			msg += ` ${message.d.err}`;
		}
		this.logger.shardStatus.push(msg);
	}

	shardReady(message) {
		let msg = `[Events] Shard ${message.d} ready.`;
		this.logger.shardStatus.push(msg);
	}

	shardResume(message) {
		let msg = `[Events] Shard ${message.d} resumed.`;
		this.logger.shardStatus.push(msg);
	}

	shardIdentify(message) {
		let msg = `[Events] Shard ${message.d} identified.`;
		this.logger.shardStatus.push(msg);
	}
}

module.exports = Events;
