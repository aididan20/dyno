'use strict';

const os = require('os');
const moment = require('moment');
const { exec } = require('child_process');
const {Command} = require('@dyno.gg/dyno-core');

require('moment-duration-format');

class Stats extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['stats'];
		this.group        = 'Info';
		this.description  = 'Get bot stats.';
		this.usage        = 'stats';
		this.hideFromHelp = true;
		this.cooldown     = 5000;
		this.expectedArgs = 0;
	}

	sumKeys(key, data) {
		return data.reduce((a, b) => a + (b[key] ? parseInt(b[key], 10) : 0), 0);
	}

	async execute({ message, args }) {
		const stateMap = {
			Lance: 0,
			Beta:  1,
			Lunar: 2,
			Carti: 3,
			API:   5,
			Arsen: 6,
		};

		const idMap = Object.keys(stateMap).reduce((obj, key) => {
			obj[stateMap[key]] = key;
			return obj;
		}, {});

		let state = args.length ? (isNaN(args[0]) ? stateMap[args[0]] : args[0]) : this.config.state;
		let stateName = args.length ? (isNaN(args[0]) ? args[0] : idMap[args[0]]) : this.config.stateName;

		if (!state || !stateName) {
			state = this.config.state;
			stateName = this.config.stateName;
		}

		const [shards, guildCounts, vc] = await Promise.all([
			this.redis.hgetall(`dyno:cstats:${this.config.client.id}`),
			this.redis.hgetall(`dyno:guilds:${this.config.client.id}`),
			this.redis.hgetall(`dyno:vc`), // eslint-disable-line
		]).catch(() => false);

		const data = {};

		data.shards = [];
		for (const key in shards) {
			const shard = JSON.parse(shards[key]);
			data.shards.push(shard);
		}

		data.guilds = Object.values(guildCounts).reduce((a, b) => a += parseInt(b), 0);
		// data.guilds = this.sumKeys('guilds', data.shards);
		data.users = this.sumKeys('users', data.shards);
		// data.voiceConnections = this.sumKeys('voice', data.shards);
		data.voice = this.sumKeys('voice', data.shards);
		data.playing = this.sumKeys('playing', data.shards);
		data.events = this.sumKeys('events', data.shards);
		data.allConnections = [...Object.values(vc)].reduce((a, b) => a + parseInt(b), 0);

		let streams = this.config.isCore ? data.allConnections : `${data.playing}/${data.voice}`,
			uptime = moment.duration(process.uptime(), 'seconds'),
			footer = `PID ${process.pid} | ${stateName} | Cluster ${this.dyno.clientOptions.clusterId.toString()} | Shard ${message.channel.guild.shard.id}`;

		const embed = {
			author: {
				name: 'Dyno',
				icon_url: `${this.config.avatar}`,
			},
			fields: [
				{ name: 'Guilds', value: data.guilds.toString(), inline: true },
				{ name: 'Users', value: data.users.toString(), inline: true },
				{ name: 'Streams', value: streams.toString(), inline: true },
				{ name: 'Load Avg', value: os.loadavg().map(n => n.toFixed(3)).join(', '), inline: true },
				{ name: 'Free Mem', value: `${this.utils.formatBytes(os.freemem())} / ${this.utils.formatBytes(os.totalmem())}`, inline: true },
				{ name: 'Uptime', value: uptime.format('w [weeks] d [days], h [hrs], m [min], s [sec]'), inline: true },
			],
			footer: {
				text: footer,
			},
			timestamp: new Date(),
		};

		if (data.events) {
			let events = Math.round(data.events / 15);
			embed.fields.push({ name: 'Events/sec', value: `${events}/sec`, inline: true });
		}

		embed.fields = embed.fields.filter(f => f.value !== '0');

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Stats;
