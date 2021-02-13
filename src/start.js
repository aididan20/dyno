'use strict';

const fs = require('fs');
const repl = require('repl');
const util = require('util');
const childProcess = require('child_process');
const config = require('./core/config');
require('./core/metrics');

global.Promise = require('bluebird');

require.extensions['.txt'] = (module, filename) => {
    module.exports = fs.readFileSync(filename, 'utf8');
};

const env = process.env.NODE_ENV;
const logo = require('./logo.txt');

process.on('SIGINT', () => process.exit());

if ((process.env.id || process.env.shardId) && process.env.shardCount) {
	process.env.clusterId = parseInt(process.env.id, 10);

	if (process.env.DEBUG_BLOCKS) {
		const blocked = require('blocked-at');
		const { stop } = blocked((time, stack) => {
			console.log(`Blocked for ${time}ms, operation started here:`, stack);
		}, { threshold: 5000 });

		setTimeout(() => stop(), 900000);
	}


	console.log(`[C${process.env.clusterId}] Process ${process.pid} online.`);

	const Dyno = require('./core/Dyno');
	const options = {};

	if (process.env.hasOwnProperty('awaitReady')) {
		options.awaitReady = process.env.awaitReady;
	}

	if (process.env.shardId) {
		options.shardId = parseInt(process.env.shardId, 10);
	}

	if (process.env.clusterId) {
		options.clusterId = parseInt(process.env.clusterId, 10);
	}

	if (process.env.shardCount) {
		options.shardCount = parseInt(process.env.shardCount, 10);
	}

	if (process.env.clusterCount) {
		options.clusterCount = parseInt(process.env.clusterCount, 10);
	}

	if (process.env.firstShardId) {
		options.firstShardId = process.env.firstShardId ? parseInt(process.env.firstShardId, 10) : null;
		options.lastShardId = process.env.lastShardId ? parseInt(process.env.lastShardId, 10) : null;
	}

	if (env === 'development') {
		require('longjohn');
	}

	const dyno = new Dyno();
	dyno.setup(options, require);
} else if (process.env.manager) {
	const Manager = require('./core/clusterManager/Manager');
	const clusterManager = new Manager(); // eslint-disable-line
} else {
	init().then(() => {
		const Manager = require('./core/processManager/Manager');
		const processManager = new Manager(); // eslint-disable-line
	});
}

function log(...args) {
	process.stdout.write(`${util.format.apply(null, args)}\n`);
}

async function init() {
	log(logo, '\n');
	log(`Starting [${env} ${config.pkg.version}]`);

	if (env === 'production') {
		return Promise.resolve();
	}

	try {
		log(`Packages:`);
		await listPackages();
	} catch (err) {}

	try {
		log(`Repo:`);
		await gitInfo();
	} catch (err) {}

	return Promise.resolve();
}

function listPackages() {
	return new Promise((res, rej) =>
		childProcess.exec('yarn list --depth=0 --pattern "@dyno.gg"', (err, stdout) => {
			if (err) {
				return rej(err);
			}
			let output = stdout.split('\n');
			log(`${output.slice(1, output.length - 1).join('\n')}\n`);
			res();
		}));
}

function gitInfo() {
	return new Promise((res, rej) =>
		childProcess.exec('git log -n 3 --no-color --pretty=format:\'[ "%h", "%s", "%cr", "%an" ],\'', (err, stdout) => {
			if (err) {
				return rej(err);
			}

			let str = stdout.split('\n').join('');
			str = str.substr(0, str.length - 1);

			let lines = JSON.parse(`[${str}]`);
			lines = lines.map(l => `[${l[0]}] ${l[1]} - ${l[2]}`);
			log(`${lines.join('\n')}\n`);
			return res();
		}));
}
