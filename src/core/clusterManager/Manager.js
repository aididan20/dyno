const Eris = require('@dyno.gg/eris');
const Logger = require('./Logger');
const Commands = require('./Commands');
const config = require('../config');
const db = require('../database');
const { Client, Server } = require('../rpc');
const { Collection } = require('@dyno.gg/dyno-core');
const { models } = db;

/**
 * @class Manager
 */
class Manager {
	/**
	 * Create the cluster manager
	 * @param {String} strategy Sharding strategy
	 */
	constructor() {
		this.processes = new Collection();
		this.clusters = new Collection();

		process.on('uncaughtException', this.handleException.bind(this));
		process.on('unhandledRejection', this.handleRejection.bind(this));

		this.globalConfig = null;
		this.restClient = null;

		this.logger = new Logger(this);
		this.methods = new Commands(this);

		this.pmClient = new Client(config.rpcHost || 'localhost', 5050);

		this.server = new Server();
		this.server.init(config.rpcHost || 'localhost', 5052, this.methods);

		db.connection.once('open', () =>
			this.connect().catch(err => {
				throw err;
			}));
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

	handleException(err) {
		if (!err || (typeof err === 'string' && !err.length)) {
			return console.error('An undefined exception occurred.'); // eslint-disable-line
		}

		console.error(err); // eslint-disable-line
	}

	async connect() {
		try {
			const coll = await db.collection('clusters');
			const [globalConfig, _clusters] = await Promise.all([
				models.Dyno.findOne().lean(),
				coll.find({ 'host.state': config.state }).toArray(),
			]);

			this.globalConfig = globalConfig;

			const token = config.isPremium ? config.client.token : this.globalConfig.prodToken || config.client.token;
			this.restClient = new Eris(`Bot ${token}`, { restMode: true });

			for (let c of _clusters) {
				this.clusters.set(c.id, c);
			}

			process.send('ready');
			let response = await this.pmClient.request('list', {});
			let processes = response && response.result ? response.result : [];

			if (!processes.length) {
				this.logger.log(`[${process.pid}] Cluster manager online, starting ${this.clusters.size} clusters`);
				return this.startup();
			} else {
				this.logger.log(`[${process.pid}] Cluster manager online, resuming with ${this.clusters.size} clusters`);
			}

			for (let proc of processes) {
				if (this.processes.has(proc.id)) { continue; }
				proc.client = new Client(config.rpcHost || 'localhost', proc.port);
				this.processes.set(proc.id, proc);
			}
		} catch (err) {
			return Promise.reject(err);
		}
	}

	async startup() {
		for (let cluster of this.clusters.values()) {
			await this.createProcess(cluster);
			await this.wait(config.clusterStartDelay || 1500);
		}
	}

	async createProcess(cluster) {
		try {
			const response = await this.pmClient.request('create', { cluster });
			if (!response || !response.result) {
				let error = response.error || response;
				return Promise.reject(error);
			}
			let proc = response.result;
			if (proc.port) {
				proc.client = new Client(config.rpcHost || 'localhost', proc.port);
			}
			this.processes.set(proc.id, proc);

			const options = proc.options;

			if (options && options.hasOwnProperty('id')) {
				this.logger.log(`[${proc.pid}] Cluster ${options.id} online`);
			}

			return true;
		} catch (err) {
			return Promise.reject(err);
		}
	}

	async deleteProcess(cluster) {
		try {
			const proc = this.processes.find(p => p.options && p.options.id === cluster.id);
			const response = await this.pmClient.request('delete', { id: proc.id });
			if (!response || !response.result) {
				let error = response.error || response;
				return Promise.reject(error);
			}
			this.clusters.delete(cluster.id);
			if (proc) {
				this.processes.delete(proc.id);
			}
			return true;
		} catch (err) {
			this.logger.error(err);
			return Promise.reject(err);
		}
	}

	async restartProcess(proc) {
		try {
			const response = await this.pmClient.request('restart', { id: proc.id });
			if (!response || !response.result) {
				let error = response.error || response;
				return Promise.reject(error);
			}

			proc = response.result;
			if (proc.port && !proc.client) {
				proc.client = new Client(config.rpcHost || 'localhost', proc.port);
			}
			this.processes.set(proc.id, proc);

			const cluster = proc.options;

			if (cluster && cluster.hasOwnProperty('id')) {
				this.logger.log(`[${proc.pid}] Cluster ${cluster.id} online`);
			}

			return true;
		} catch (err) {
			this.logger.error(err);
			return Promise.reject(err);
		}
	}

	wait(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

module.exports = Manager;
