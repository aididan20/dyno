'use strict';

const os = require('os');
const Eris = require('@dyno.gg/eris');
const config = require('../config');
const logger = require('../logger');

/**
 * @class Sharding
 */
class Sharding {
	/**
	 * Sharding manager
	 * @param {Manager} manager Cluster Manager instance
	 */
	constructor(manager) {
		this.manager = manager;
		this.logger = manager.logger;
		this.shardCount = os.cpus().length;
	}

	/**
	 * Alias for process strategy
	 */
	createShardsProcess() {
		return this.process();
	}

	/**
	 * Alias for shared strategy
	 */
	createShardsShared() {
		return this.shared();
	}

	/**
	 * Alias for balanced strategy
	 */
	createShardsBalancedCores() {
		return this.balanced();
	}

	/**
	 * Alias for semibalanced strategy
	 */
	createShardsSemiBalanced() {
		return this.semibalanced();
	}

	/**
	 * Create clusters sequentially
	 */
	async process() {
		const shardCount = config.shardCountOverride || await this.getShardCount();

		const shardIds = config.shardIds || [];

		this.shardCount = shardCount;
		this.manager.events.register();

		this.logger.log(`[Sharding] Starting with ${shardIds.length || shardCount} shards.`);

		for (let i = 0; i < shardCount; i++) {
			if (shardIds.length && !shardIds.includes(i.toString())) continue;

			this.manager.createCluster({
				id: i,
				shardCount,
			});
			await new Promise(res => setTimeout(res, 6500));
		}
	}

	/**
	 * Create a shared state instance
	 */
	async shared() {
		const shardCount = config.shardCountOverride || await this.getShardCount();

		this.shardCount = shardCount;
		this.manager.events.register();
		this.logger.log(`[Sharding] Starting with ${shardCount} shards.`);

		this.manager.createCluster({
			id: 0,
			clusterCount: 1,
			shardCount: shardCount,
			firstShardId: 0,
			lastShardId: shardCount - 1,
		});
	}

	chunkArray(arr, chunkCount) {
		const arrLength = arr.length;
		const tempArray = [];
		let chunk = [];

		const chunkSize = Math.floor(arr.length / chunkCount);
		let mod = arr.length % chunkCount;
		let tempChunkSize = chunkSize;

		for (let i = 0; i < arrLength; i += tempChunkSize) {
			tempChunkSize = chunkSize;
			if (mod > 0) {
				tempChunkSize = chunkSize + 1;
				mod--;
			}
			chunk = arr.slice(i, i + tempChunkSize);
			tempArray.push(chunk);
		}

		return tempArray;
	}

	/**
	 * Create shards balanced across all cores
	 * @param  {Boolean|undefined} semi If false, round up to a multiple of core count
	 */
	async balanced(semi) {
		const shardCount = config.shardCountOverride || await this.getShardCount(semi);
		const len = config.clusterCount || os.cpus().length;

		let firstShardId = config.firstShardOverride || 0,
			lastShardId = config.lastShardOverride || (shardCount - 1);

		const localShardCount = config.shardCountOverride ? (lastShardId + 1) - firstShardId : shardCount;

		const shardIds = [...Array(1 + lastShardId - firstShardId).keys()].map(v => firstShardId + v);
		// const clusterShardCount = Math.ceil(shardIds.length / len);
		const shardCounts = this.chunkArray(shardIds, len);

		this.shardCount = shardCount;

		this.manager.events.register();
		this.logger.log(`[Sharding] Starting with ${localShardCount} shards in ${len} clusters.`);

		const clusterIds = config.clusterIds || [];

		for (let i in shardCounts) {
			const count = shardCounts[i].length;
			lastShardId = (firstShardId + count) - 1;

			if (clusterIds.length && !clusterIds.includes(i.toString())) {
				firstShardId += count;
				continue;
			}

			await this.manager.createCluster({
				id: i.toString(),
				clusterCount: len.toString(),
				shardCount: shardCount.toString(),
				firstShardId: firstShardId.toString(),
				lastShardId: lastShardId.toString(),
			});

			firstShardId += count;
		}
	}

	/**
	 * Create shards semi-balanced across all ores
	 */
	async semibalanced() {
		return this.balanced(true);
	}

	/**
	 * Get estimated guild count
	 */
	async getEstimatedGuilds() {
		const client = new Eris(config.client.token);

		try {
			var data = await client.getBotGateway();
		} catch (err) {
			return Promise.resolve();
		}

		if (!data || !data.shards) return Promise.resolve();

		logger.info(`[Sharding] Discord suggested ${data.shards} shards.`);
		return Promise.resolve(parseInt(data.shards) * 1000);
	}

	/**
	 * Fetch guild count with fallbacks in the event of an error
	 * @return {Number} Guild count
	 */
	async fetchGuildCount() {
		let res, guildCount;
		guildCount = await this.getEstimatedGuilds();
		return guildCount;
	}

	/**
	 * Get shard count to start
	 * @param  {Boolean} balanced Whether or not to round up
	 * @return {Number} Shard count
	 */
	async getShardCount(balanced) {
		try {
			var guildCount = await this.fetchGuildCount();
		} catch (err) {
			throw new Error(err);
		}

		if (!guildCount || isNaN(guildCount)) {
			throw new Error('Unable to get guild count.');
		}

		guildCount = parseInt(guildCount);

		logger.debug(`${guildCount} Guilds`);

		if (guildCount < 2500) {
			guildCount = 2500;
		}

		let n = balanced ? os.cpus().length : 2;

		const shardCalc = Math.round((Math.ceil(guildCount / 2500) * 2500) / 1400);
		return Math.max(this.shardCount, n * Math.ceil(shardCalc / n));
	}
}

module.exports = Sharding;
