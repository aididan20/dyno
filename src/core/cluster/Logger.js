'use strict';

const axios = require('axios');
const config = require('../config');
const logger = require('../logger');

/**
 * @class Logger
 */
class Logger {
	constructor(manager) {
		this._postBlockedInterval = null;
		this._postStatusInterval = null;

		this.blocked = [];
		this.shardStatus = [];

		this.logger = manager.logger;
	}

	register() {
		this._postBlockedInterval = setInterval(() => {
			if (!this.blocked || !this.blocked.length) return;

			this.log('Event Loops Blocked', null, {
				webhookUrl: config.shardWebhook,
				username: 'Shard Manager',
				text: this.blocked.join('\n'),
				suppress: true,
			});

			this.blocked = [];
		}, 5000);

		this._postStatusInterval = setInterval(() => {
			if (!this.shardStatus || !this.shardStatus.length) return;

			this.log('Shard Status Updates', null, {
				webhookUrl: config.shardWebhook,
				username: 'Shard Manager',
				text: this.shardStatus.join('\n'),
				suppress: true,
			});

			this.shardStatus = [];
		}, 14000);
	}

	unload() {
		if (this._postBlockedInterval) {
			clearInterval(this._postBlockedInterval);
		}

		if (this._postStatusInterval) {
			clearInterval(this._postStatusInterval);
		}
	}

	/**
	 * Log cluster status to console and discord
	 * @param {String} text Text to log
	 * @param {Array} [fields] Array of field objects for embed
	 * @param {Object} [options] An options object
	 */
	log(title, fields, options) {
		if (!options || !options.suppress) {
			logger.info(title);
		}

		// if (config.state === 2) return;
		if (!config.cluster) return;

		options = options || {};

		const webhookUrl = options.webhookUrl || config.cluster.webhookUrl,
			username = options.username || 'Cluster Manager';

		const payload = {
            username: username,
            avatar_url: `${config.avatar}`,
            embeds: [],
            tts: false,
        };

        const embed = {
			title: title,
			timestamp: new Date(),
			footer: {
				text: config.stateName,
			},
        };

        if (options.text) {
			embed.description = options.text;
        }

        if (fields) embed.fields = fields;

        payload.embeds.push(embed);

        this.postWebhook(webhookUrl, payload)
        	.catch(err => logger.error(err)); // eslint-disable-line
	}

	info(...args) {
		logger.info(...args);
	}

	/**
	 * Post to a discord webhook
	 * @param {String} webhook The webhook to post to
	 * @param {Object} payload The json payload to send
	 * @return {Promise}
	 */
	postWebhook(webhook, payload) {
		return new Promise((resolve, reject) =>
			axios.post(webhook, {
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				...payload
			})
			.then(resolve)
			.catch(reject));
	}
}

module.exports = Logger;
