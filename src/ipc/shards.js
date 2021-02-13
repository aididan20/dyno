'use strict';

const moment = require('moment');
require('moment-duration-format');

module.exports = function shards(dyno) {
        try {
			const uptime = moment.duration(process.uptime(), 'seconds');
			const started = moment().subtract(process.uptime(), 'seconds').format('llll');
			const client = dyno.client;
			const payload = {
				shardCount: client.shards.size,
				connectedCount: client.shards.filter(s => s.status === 'ready').length,
				guildCount: client.guilds.size,
				unavailableCount: client.unavailableGuilds.size,
				voiceConnections: client.voiceConnections.size,
				shards: [...client.shards.keys()],
				uptime: uptime.format('w [w] d [d], h [h], m [m], s [s]'),
				started: started,
			}
			process.send({ op: 'resp', d: payload });
        } catch (err) {
			dyno.logger.error(err);
        }
};