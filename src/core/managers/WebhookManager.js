'use strict';

const axios = require('axios');

/**
 * @class WebhookManager
 */
class WebhookManager {
	/**
	 * Manage webhook operations
	 * @param {Object} config The Dyno configuration
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor(dyno) {
		this.dyno = dyno;
		this.config = dyno.config;
		this.client = dyno.client;

		this.avatarUrl = `${this.config.avatar}?r=${this.config.version}`;

		this.default = {
			username: 'Dyno',
			avatarURL: this.avatarUrl,
			tts: false,
		};
	}

	/**
	 * Get or create a channel webhook
	 * @param {Channel} channel Eris channel object
	 * @returns {Promise}
	 */
	async getOrCreate(channel) {
		let id = (typeof channel === 'string') ? channel : channel.id || null;
		if (!id) return Promise.reject(`Invalid channel or id.`);

		try {
			const webhooks = await this.client.getChannelWebhooks(channel.id);

			let webhook = webhooks.find(hook => hook.name === 'Dyno');
			if (webhook) {
				return Promise.resolve(webhook);
			}

			const res = await axios.get(this.avatarUrl, {
				headers: { Accept: 'image/*' },
				responseType: 'arraybuffer',
			}).then(response => `data:${response.headers['content-type']};base64,${response.data.toString('base64')}`);

			webhook = await this.client.createChannelWebhook(channel.id, {
				name: 'Dyno',
				avatar: res,
			});

			return Promise.resolve(webhook);
		} catch (err) {
			return Promise.reject(err);
		}
	}

	/**
	 * Execute a webhook
	 * @param {Channel} channel Eris channel object
	 * @param {Object} options Webhook options to send
	 * @returns {Promise}
	 */
	async execute(channel, options, webhook) {
		let avatarUrl = `https://cdn.discordapp.com/avatars/${this.dyno.user.id}/${this.dyno.user.avatar}.jpg`;
		options.avatarURL = options.avatarURL || avatarUrl;
		const content = Object.assign({}, this.default, options || {});

		if (webhook) {
			if (options.slack) {
				delete options.slack;
				return this.client.executeSlackWebhook(webhook.id, webhook.token, content);
			}
			return this.client.executeWebhook(webhook.id, webhook.token, content);
		}

		try {
			const webhook = await this.getOrCreate(channel);
			if (options.slack) {
				delete options.slack;
				return this.client.executeSlackWebhook(webhook.id, webhook.token, content);
			}
			return this.client.executeWebhook(webhook.id, webhook.token, content);
		} catch (err) {
			return Promise.reject(err);
		}
	}
}

module.exports = WebhookManager;
