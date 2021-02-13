'use strict';

const StatsD = require('hot-shots');
const logger = require('./logger');
const config = require('./config');

const client = new StatsD({
	host: config.statsd.host,
	port: config.statsd.port,
	prefix: config.statsd.prefix,
});

client.socket.on('error', err => {
	logger.error('Error in socket: ', err);
});

module.exports = client;
