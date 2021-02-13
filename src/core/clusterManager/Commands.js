const config = require('../config');
const db = require('../database');
const { Client } = require('../rpc');

class Commands {
	constructor(manager) {
		this.manager = manager;
		this.logger = manager.logger;
		this.pmClient = manager.pmClient;
		this.restClient = manager.restClient;

		return {
			blocked: this.blocked.bind(this),
			processExit: this.processExit.bind(this),
			processReady: this.processReady.bind(this),
			createCluster: this.createCluster.bind(this),
			moveCluster: this.moveCluster.bind(this),
			shardDisconnect: this.shardDisconnect.bind(this),
			shardReady: this.shardReady.bind(this),
			shardResume: this.shardResume.bind(this),
			restart: this.restart.bind(this),
		}
	}

	async processReady({ process }, cb) {
		if (process.port) {
			process.client = new Client(config.rpcHost || 'localhost', process.port);
		}
		this.manager.processes.set(process.id, process);

		const cluster = process.options;

		if (cluster && cluster.id) {
			this.logger.log(`[${process.pid}] Cluster ${cluster.id} ready`);
		}

		return cb(null);
	}

	processExit({ process, code, signal }, cb) {
		const cluster = process.options;

		if (cluster && cluster.id) {
			const meta = cluster.firstShardId !== null ? `${cluster.firstShardId}-${cluster.lastShardId}` : cluster.id.toString();

			this.logger.log(`Cluster ${cluster.id} died with code ${signal || code}`, [
				{ name: 'Shards', value: meta },
			]);
		}

		return cb(null);
	}

	async restart({ id, token }, cb) {
		if (!token || id == undefined) {
			return cb('Invalid request');
		}

		const restartToken = config.restartToken;
		if (token !== restartToken) {
			return cb('Invalid token');
		}

		try {
			if (id === 'all') {
				for (let proc of this.manager.processes.values()) {
					await this.manager.restartProcess(proc);
				}

				return cb(null);
			}

			const proc = this.manager.processes.find(p => p.options.id === parseInt(id, 10));
			if (!proc) {
				return cb(`Unable to find cluster ${id}`);
			}

			this.logger.log(`[${proc.pid}] Cluster ${id} restarting`);
			await this.manager.restartProcess(proc);
			return cb(null);
		} catch (err) {
			this.logger.error(err);
			return cb(err);
		}
	}

	async createCluster({ id }, cb) {
		try {
			let cluster = this.manager.clusters.get(id);
			if (!cluster) {
				const coll = db.collection('clusters');
				cluster = await coll.findOne({ 'host.state': config.state, id });
				this.manager.clusters.set(id, cluster);
			}
			await this.manager.createProcess(cluster);
			return cb(null);
		} catch (err) {
			this.logger.error(err);
			return cb(err);
		}
	}

	async moveCluster({ id, name, token }, cb) {
		if (!token || id == undefined) {
			return cb('Invalid request');
		}

		const restartToken = config.restartToken;
		if (token !== restartToken) {
			return cb('Invalid token');
		}

		try {
			const cluster = this.manager.clusters.get(id);
			const host = await db.collection('hosts').findOne({ name });
			if (!host) {
				return cb('Inavalid host.');
			}

			await db.collection('clusters').updateOne({ 'host.state': config.state, id }, { $set: { host: host } });

			const client = new Client(host.hostname, 5052);

			await client.request('createCluster', { id });
			await this.manager.deleteProcess(cluster);

			return cb(null);
		} catch (err) {
			this.logger.error(err);
			return cb(err);
		}
	}

	blocked({ text }, cb) {
		this.logger.blocked.push(text);
		return cb(null);
	}

	shardDisconnect({ id, cluster, err }, cb) {
		let msg = `[C${cluster}] Shard ${id} disconnected`;
		if (err) {
			msg += ` ${err}`;
		}
		this.logger.shardStatus.push(msg);
		return cb(null);
	}

	shardReady({ id, cluster }, cb) {
		let msg = `[C${cluster}] Shard ${id} ready`;
		this.logger.shardStatus.push(msg);
		return cb(null);
	}

	shardResume({ id, cluster }, cb) {
		let msg = `[C${cluster}] Shard ${id} resumed`;
		this.logger.shardStatus.push(msg);
		return cb(null);
	}
}

module.exports = Commands;
