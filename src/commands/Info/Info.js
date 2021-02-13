'use strict';

const {Command} = require('@dyno.gg/dyno-core');
const moment = require('moment');

require('moment-duration-format');

class Info extends Command {
	constructor(...args) {
		super(...args);

	this.aliases      = ['info'];
	this.group        = 'Info';
	this.description  = 'Get bot info.';
	this.usage        = 'info';
	this.cooldown     = 60000;
	this.expectedArgs = 0;
	this.noDisable    = true;
	this.sendDM       = true;
	}

	async execute({ message }) {
		const uptime = moment.duration(process.uptime(), 'seconds');
		const cluster = this.dyno.clientOptions.clusterId.toString();
		const uptimeText = uptime.format('w [weeks] d [days], h [hrs], m [min], s [sec]');
		const footer = `${this.config.stateName} | Cluster ${cluster} | Shard ${message.channel.guild.shard.id} | Uptime ${uptimeText}`;

		const embed = {
			color: this.utils.hexToInt('#3395d6'),
			author: {
				name: 'Dyno',
				url: 'https://www.dyno.gg',
				icon_url: `${this.config.avatar}?r=${this.config.version}`,
			},
			fields: [],
			footer: {
				text: footer,
			},
		};

		embed.fields.push({ name: 'Version', value: this.config.version, inline: true });
		embed.fields.push({ name: 'Library', value: this.config.lib, inline: true });
		embed.fields.push({ name: 'Creator', value: this.dyno.globalConfig.author, inline: true });

		try {
			const [res, guildCounts] = await Promise.all([
				this.redis.hgetall(`dyno:stats:${this.config.state}`),
				this.redis.hgetall(`dyno:guilds:${this.config.client.id}`),
			]);

			let guildCount = Object.values(guildCounts).reduce((a, b) => a += parseInt(b), 0);

			let shards = [];
			for (const key in res) {
				const shard = JSON.parse(res[key]);
				shards.push(shard);
			}

			const userCount = this.utils.sumKeys('users', shards);

			embed.fields.push({ name: 'Servers', value: guildCount.toString(), inline: true });
			embed.fields.push({ name: 'Users', value: userCount.toString(), inline: true });
		} catch (err) {
			this.logger.error(err);
		}

		embed.fields.push({ name: 'Website', value: '[dyno.gg](https://www.dyno.gg)', inline: true });
		embed.fields.push({ name: 'Invite', value: '[dyno.gg/invite](https://www.dyno.gg/invite)', inline: true });
		embed.fields.push({ name: 'Discord', value: '[dyno.gg/discord](https://www.dyno.gg/discord)', inline: true });
		embed.fields.push({ name: 'Donate', value: '[dyno.gg/donate](https://www.dyno.gg/donate)', inline: true });

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Info;
