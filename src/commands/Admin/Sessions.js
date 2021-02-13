'use strict';

const { Command } = require('@dyno.gg/dyno-core');
const moment = require('moment');

require('moment-duration-format');

class Sessions extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['sessions'];
		this.group        = 'Admin';
		this.description  = 'Get session data';
		this.usage        = 'uptime';
		this.cooldown     = 10000;
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.overseerEnabled = true;
		this.expectedArgs = 0;
	}

	permissionsFn({ message }) {
		if (!message.member) return false;
		if (message.guild.id !== this.config.dynoGuild) return false;

		if (this.isServerAdmin(message.member, message.channel)) return true;
		if (this.isServerMod(message.member, message.channel)) return true;

		let allowedRoles = [
			'225209883828420608', // Accomplices
			'222393180341927936', // Regulars
			'355054563931324420', // Trusted
		];

		const roles = message.guild.roles.filter(r => allowedRoles.includes(r.id));
		if (roles && message.member.roles.find(r => roles.find(role => role.id === r))) return true;

		return false;
	}

	async execute({ message }) {
		try {
			var data = await this.client.getBotGateway();
		} catch (err) {
			return this.error(message.channel, err);
		}

		let resetAfter = moment.duration(data.session_start_limit.reset_after, 'milliseconds'),
			resetAfterDate = moment().subtract(data.session_start_limit.reset_after, 'milliseconds').format('llll');

		const embed = {
			color: this.utils.getColor('blue'),
			title: 'Session Data',
			fields: [
				{ name: 'Recommended Shards', value: data.shards.toString(), inline: true },
				{ name: 'Session Limit', value: data.session_start_limit.total.toString(), inline: true },
				{ name: 'Session Remaining', value: data.session_start_limit.remaining.toString(), inline: true },
				{ name: 'Reset After', value: resetAfter.format('d [days], h [hrs], m [min], s [sec]') },
				{ name: 'Reset After Date', value: resetAfterDate },
			],
			timestamp: (new Date()).toISOString(),
		};

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Sessions;
