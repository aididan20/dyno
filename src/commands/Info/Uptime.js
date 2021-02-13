'use strict';

const {Command} = require('@dyno.gg/dyno-core');
const moment = require('moment');

require('moment-duration-format');

class Uptime extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['uptime', 'up'];
		this.group        = 'Info';
		this.description  = 'Get bot uptime';
		this.usage        = 'uptime';
		this.cooldown     = 3000;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		let uptime = moment.duration(process.uptime(), 'seconds'),
			started = moment().subtract(process.uptime(), 'seconds').format('llll');

		const embed = {
			color: this.utils.getColor('blue'),
			title: 'Uptime',
			description: uptime.format('w [weeks] d [days], h [hrs], m [min], s [sec]'),
			footer: {
				text: `PID ${process.pid} | ${this.config.stateName} | Cluster ${this.dyno.clientOptions.clusterId.toString()} | Shard ${message.channel.guild.shard.id} | Last started on ${started}`,
			},
		};

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Uptime;
