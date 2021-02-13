'use strict';

const axios = require('axios');
const { Module } = require('@dyno.gg/dyno-core');
/**
 * Carbon Module
 * @class Carbon
 * @extends Module
 */
class Carbon extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'Carbon';
		this.enabled = true;
		this.core = true;
		this.list = false;
		this.guildsGauge = this.prom.register.getSingleMetric('dyno_app_guilds_carbon');
	}

	static get name() {
		return 'Carbon';
	}

	start() {
		this.schedule('*/1 * * * *', this.updateCarbon.bind(this));
	}

	async updateCarbon() {
		if (!this.dyno.isReady) return;
		if (this.config.state !== 3 || this.dyno.clientOptions.clusterId !== 0) return;

		this.info('Updating carbon stats.');

		try {
			var guildCounts = await this.redis.hgetall(`dyno:guilds:${this.config.client.id}`);
		} catch (err) {
			return this.logger.error(err);
		}

		let guildCount = Object.values(guildCounts).reduce((a, b) => a += parseInt(b), 0);

		this.guildsGauge.set(guildCount);

		const data = {
			shard_id: 0,
			shard_count: 1,
			server_count: guildCount,
		};

		// Post to carbonitex
		axios.post(this.config.carbon.url, {
			headers: { Accept: 'application/json' },
			key: this.config.carbon.key,
			...Object.assign(data, {
				logoid: `https://www.dynobot.net/images/dyno-v2-300.jpg`,
			}),
		}).catch(() => null);

		// Post to bots.discord.pw
		axios.post(this.config.dbots.url, {
			headers: {
				Authorization: this.config.dbots.key,
				Accept: 'application/json',
			},
			...data,
		}).catch(() => null);

		// Post to discordbots.org
		axios.post(this.config.dbl.url, {
			headers: {
				Authorization: this.config.dbl.key,
				Accept: 'application/json',
			},
			...data,
		}).catch(() => null);

		// Post to discordbots.org
		axios.post(this.config.botspace.url, {
			headers: {
				Authorization: this.config.botspace.key,
				Accept: 'application/json',
			},
			...data,
		}).catch(() => null);
	}
}

module.exports = Carbon;
