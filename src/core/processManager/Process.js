const cluster = require('cluster');
const uuid = require('uuid/v4');

var EventEmitter;

try {
	EventEmitter = require('eventemitter3');
} catch (e) {
	EventEmitter = require('events');
}

/**
 * @class Process
 * @extends {EventEmitter}
 */
class Process extends EventEmitter {
	/**
	 * Representation of a process
	 *
	 * @prop {Number} id Process ID
	 * @prop {Object} worker The worker
	 * @prop {Object} process The worker process
	 * @prop {Number} pid The worker process ID
	 * @prop {Number} port The process RPC port
	 */
	constructor(manager, options = {}) {
		super();

		this.id = uuid();
		this.pid = null;
		this.port = null;
		this.options = options || {};
		this.createdAt = Date.now();

		if (options.manager) {
			this.manager = true;
			this.port = 5052;
		}

		if (options.cluster && options.cluster.id) {
			this.port = 30000 + parseInt(options.cluster.id, 10);
		}

		this.worker = this.createWorker(options.awaitReady);
		this.process = this.worker.process;
	}

	createWorker(awaitReady = false) {
		const worker = cluster.fork(
			Object.assign({
				awaitReady: awaitReady,
				uuid: this.id,
			}, this.options)
		);

		this.pid = worker.process.pid;
		this.createdAt = Date.now();

		process.nextTick(() => {
			this._readyListener = this.ready.bind(this);
			worker.on('message', this._readyListener);
		});

		return worker;
	}

	restartWorker(awaitReady = false) {
		const worker = this.createWorker(awaitReady);
		const oldWorker = this.worker;
		const createdAt = Date.now();
		this._pid = worker.process.pid;

		return new Promise(resolve => {
			this.on('ready', () => {
				if (this.worker) {
					oldWorker.kill('SIGTERM');
				}

				process.nextTick(() => {
					this.worker = worker;
					this.process = worker.process;
					this.pid = worker.process.pid;
					this.createdAt = createdAt;
					return resolve(this);
				});
			});
		});
	}

	ready(message) {
		if (!message) return;
		if (message === 'ready' || message.op === 'ready') {
			this.worker.removeListener('ready', this._readyListener);
			this.emit('ready');
		}
	}
}

module.exports = Process;
