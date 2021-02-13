'use strict';

const { Collection, Module } = require('@dyno.gg/dyno-core');
const axios = require('axios');
const blocked = require('blocked');
const moment = require('moment');

/**
 * ShardStatus module
 * @class ShardStatus
 * @extends Module
 */
class ShardStatus extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'ShardStatus';
		this.description = 'Dyno core module.';
		this.core = true;
		this.list = false;
		this.enabled = true;
		this.hasPartial = false;

		this.cmClient = this.dyno.cmClient;
	}

	static get name() {
		return 'ShardStatus';
	}

	start() {
		this.shardListeners = new Collection();

		this.shardListeners.set('shardReady', this.shardReady.bind(this));
		this.shardListeners.set('shardResume', this.shardResume.bind(this));
		this.shardListeners.set('shardDisconnect', this.shardDisconnect.bind(this));

		for (let [event, listener] of this.shardListeners) {
			this.client.on(event, listener);
		}

		this.blockHandler = blocked(ms => {
			const id = this.cluster.clusterId.toString();
			const text = `C${id} blocked for ${ms}ms`;

			this.logger.info(`[Dyno] ${text}`);

			try {
				this.cmClient.request('blocked', { text });
			} catch (err) {
				// pass
			}
		}, { threshold: 10000 });
	}

	unload() {
		if (this.blockHandler) {
			clearInterval(this.blockHandler);
			this.blockHandler = null;
		}
		if (!this.shardListeners.size) return;
		for (let [event, listener] of this.shardListeners) {
			this.client.removeListener(event, listener);
		}
	}

	/**
	 * Shard ready handler
	 * @param  {Number} id Shard ID
	 */
	shardReady(id) {
		this.logger.info(`[Dyno] Shard ${id} ready.`);

		try {
			this.postStat('ready');
			this.cmClient.request('shardReady', { id, cluster: this.cluster.clusterId });
		} catch (err) {
			// pass
		}
	}

	/**
	 * Shard resume handler
	 * @param  {Number} id Shard ID
	 */
	shardResume(id) {
		this.logger.info(`[Dyno] Shard ${id} resumed.`);

		try {
			this.postStat('resume');
			this.cmClient.request('shardResume', { id, cluster: this.cluster.clusterId });
		} catch (err) {
			// pass
		}
	}

	/**
	 * Shard disconnect handler
	 * @param  {Error} err Error if one is passed
	 * @param  {Number} id  Shard ID
	 */
	shardDisconnect(err, id) {
		if (err) {
			const shard = this.client.shards.get(id);
			this.logger.warn(err, { type: 'dyno.shardDisconnect', cluster: this.cluster.clusterId, shard: id, trace: shard.discordServerTrace });
		}

		this.logger.info(`[Dyno] Shard ${id} disconnected`);

		let data = { id, cluster: this.cluster.clusterId };
		if (err) {
			if (err.code) {
				data.err = err.code;
			} else if (err.message) {
				data.err = err.message;
			}
		}

		try {
			this.postStat('disconnect');
			this.cmClient.request('shardDisconnect', data);
		} catch (err) {
			// pass
		}
	}

	async postStat(key) {
		const day = moment().format('YYYYMMDD');
		const hr = moment().format('YYYYMMDDHH');

		this.prom.register.getSingleMetric('dyno_app_discord_shard').inc({ type: key });

		const [dayExists, hrExists] = await Promise.all([
			this.redis.exists(`shard.${key}.${day}`),
			this.redis.exists(`shard.${key}.${hr}`),
		]);

		const multi = this.redis.multi();

		multi.incrby(`shard.${key}.${day}`, 1);
		multi.incrby(`shard.${key}.${hr}`, 1);

		if (!dayExists) {
			multi.expire(`shard.${key}.${day}`, 604800);
		}

		if (!hrExists) {
			multi.expire(`shard.${key}.${hr}`, 259200);
		}

		multi.exec().catch(err => this.logger.error(err));
	}

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

module.exports = ShardStatus;
