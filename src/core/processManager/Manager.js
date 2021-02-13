const cluster = require('cluster');
const config = require('../config');
const logger = require('../logger');
const { Collection } = require('@dyno.gg/dyno-core');
const { Client, Server, LogServer } = require('../rpc');
const Process = require('./Process');

/**
 * @class Manager
 */
class Manager {
	constructor() {
		this.processes = new Collection();

		process.on('uncaughtException', this.handleException.bind(this));
		process.on('unhandledRejection', this.handleRejection.bind(this));

		cluster.on('exit', this.handleExit.bind(this));

		cluster.setupMaster({
			silent: true,
		});

		this.logServer = new LogServer();
		this.logServer.init(5025);

		this.clusterManager = this.createManager();

		let methods = {
			create: this.create.bind(this),
			delete: this.delete.bind(this),
			list: this.list.bind(this),
			restart: this.restart.bind(this),
			restartManager: this.restartManager.bind(this),
		};

		this.client = new Client(config.rpcHost || 'localhost', 5052);

		this.server = new Server();
		this.server.init(config.rpcHost || 'localhost', 5050, methods);
	}

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

	createManager() {
		const proc = new Process(this, {
			manager: true,
		});
		this.logServer.hook(proc);

		return proc;
	}

	createProcess(options) {
		const process = new Process(this, options);
		this.processes.set(process.id, process);
		this.logServer.hook(process);

		return process;
	}

	getProcess(worker) {
		return this.processes.find(s => s.pid === worker.process.pid || s._pid === worker.process.pid);
	}

	handleExit(worker, code, signal) {
		const process = this.getProcess(worker);

		if (signal && signal === 'SIGTERM') return;
		if (!process) return;

		this.client.request('processExit', { process, code, signal });

		// Restart worker
		process.restartWorker().then(() => {
			this.client.request('processReady', { process });
		});
	}

	create(payload, cb) {
		const options = payload && (payload.cluster || {});
		const process = this.createProcess(options);
		return cb(null, process);
	}

	delete(payload, cb) {
		if (!payload.id) {
			return cb('Missing ID');
		}
		const process = this.processes.get(payload.id);
		if (!process) {
			return cb(`Process ${payload.id} not found.`);
		}
		try {
			process.worker.kill('SIGTERM');
			this.processes.delete(payload.id);
			return cb(null, 'OK');
		} catch (err) {
			logger.error(err);
			return cb(err);
		}
	}

	list(payload, cb) {
		return cb(null, [...this.processes.values()]);
	}

	async restart(payload, cb) {
		if (!payload.id) {
			return cb('Missing ID');
		}

		const process = this.processes.get(payload.id);
		if (!process) {
			return cb(`Process ${payload.id} not found.`);
		}
		try {
			const proc = await process.restartWorker(true);
			return cb(null, proc);
		} catch (err) {
			logger.error(err);
			return cb(err);
		}
	}

	restartManager(payload, cb) {
		this.clusterManager.restartWorker();
		return cb(null, 'OK');
	}
}

module.exports = Manager;
