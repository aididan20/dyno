'use strict';

const util = require('util');
const moment = require('moment');
const winston = require('winston');
const config = require('./config');
const Sentry = require('./transports/winston-sentry');

/**
 * @class Logger
 */
class Logger {
	/**
	 * @prop {Array} transports
	 * @prop {Boolean} exitOnError
	 */
	constructor() {
		this.transports = [
			new (winston.transports.Console)({
				colorize: true,
				level: config.logLevel || 'info',
				debugStdout: true,
				// handleExceptions: true,
				// humanReadableUnhandledException: true,
				timestamp: () => new Date(),
				formatter: this._formatter.bind(this),
			}),
		];

		if (config.sentry.dsn) {
			this.transports.push(new Sentry({
				// patchGlobal: true,
				level: config.sentry.logLevel || 'error',
				dsn:   config.sentry.dsn,
				logger: config.stateName,
			}));
		}

		this.exitOnError = false;

		return new (winston.Logger)(this);
	}

	/**
	 * Custom formatter for console
	 * @param {Object} options Formatter options
	 * @returns {String}
	 * @private
	 */
	_formatter(options) {
		let ts = util.format('[%s]', moment(options.timestamp()).format('HH:mm:ss')),
			level = winston.config.colorize(options.level);

		if (process.env.hasOwnProperty('clusterId')) {
			ts = `[C${process.env.clusterId}] ${ts}`;
		}

		if (!options.message.length && options.meta instanceof Error) {
			options.message = options.meta + options.meta.stack;
		}

		if (options.meta && options.meta.guild && typeof options.meta.guild !== 'string') {
			if (options.meta.guild.shard) {
				options.meta.shard = options.meta.guild.shard.id;
			}
			options.meta.guild = options.meta.guild.id;
		}

		switch (options.level) {
			case 'debug':
				ts += ' ⚙ ';
				break;
			case 'info':
				ts += ' 🆗 ';
				break;
			case 'error':
				ts += ' 🔥 ';
				break;
			case 'warn':
				ts += ' ☣ ';
				break;
			case 'silly':
				ts += ' 💩 ';
				break;
		}

		let message = ts + ' ' + level + ': ' + (undefined !== options.message ? options.message : '') +
			(options.meta && Object.keys(options.meta).length ? '\n\t' + util.inspect(options.meta) : '');

		if (options.colorize === 'all') {
			return winston.config.colorize(options.level, message);
		}

		return message;
	}
}

module.exports = new Logger();
