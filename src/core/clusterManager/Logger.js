const config = require('../config');
const logger = require('../logger');
const { utils } = require('@dyno.gg/dyno-core');

/**
 * @class Logger
 */
class Logger {
	constructor(manager) {
		this._postBlockedInterval = null;
		this._postStatusInterval = null;

		this.blocked = [];
		this.shardStatus = [];

		this.manager = manager;
		this.client = manager.restClient;

		this.register();
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
		}, 6000);

		this._postStatusInterval = setInterval(() => {
			if (!this.shardStatus || !this.shardStatus.length) return;

			let msgArray = [];
			msgArray = msgArray.concat(utils.splitMessage(this.shardStatus, 1900));

			for (let msg of msgArray) {
				this.log('Shard Status Updates', null, {
					webhookUrl: config.shardWebhook,
					username: 'Shard Manager',
					text: msg,
					suppress: true,
				});
			}

			this.shardStatus = [];
		}, 5500);
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

		const webhookUrl = options.webhookUrl || config.cluster.webhookUrl;
		const username = options.username || 'Cluster Manager';

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

	error(...args) {
		logger.error(...args);
	}

	/**
	 * Post to a discord webhook
	 * @param {String} webhook The webhook to post to
	 * @param {Object} payload The json payload to send
	 * @return {Promise}
	 */
	postWebhook(webhook, payload) {
		const [id, token] = webhook.split('/').slice(-2);
		return this.manager.restClient.executeWebhook(id, token, payload);
	}
}

module.exports = Logger;
