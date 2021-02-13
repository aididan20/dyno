'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Premium extends Command {
	constructor(...args) {
		super(...args);

		this.aliases 		= ['premium'];
		this.group 			= 'Info';
		this.description 	= 'Dyno premium information. (Responds in DM)';
		this.usage 			= 'premium';
		this.noDisable      = true;
		this.expectedArgs 	= 0;
		this.cooldown 		= 60000;
	}

	execute({ message }) {
		let pref = '`▶`';
		const embed = {
			color: this.utils.getColor('premium'),
			author: {
				name: 'Dyno Premium',
				icon_url: 'https://cdn.dyno.gg/dyno-premium-64.png',
			},
			description: [
				`Premium is an exclusive version of Dyno with premium features, and improved quality / uptime.`,
				`It's also a great way to support Dyno development and hosting!`,
			].join('\n'),
			fields: [
				{ name: 'Features', value: [
					`${pref} Hosted on private/dedicated servers for 99.99% uptime.`,
					`${pref} Volume control, playlists, Soundcloud, and more saved queues.`,
					`${pref} Slowmode: Managing chat speed per user or channel.`,
					`${pref} Autopurge: Purge messages at set times.`,
					`${pref} Higher speed/performance and unnoticeable restarts or downtime.`,
					`${pref} Fewer performance-based limits.`,
				].join('\n') },
				{ name: 'Get Premium', value: `You can upgrade today at https://www.dynobot.net/upgrade` },
			],
		};

		return this.sendDM(message.author.id, { embed });
	}
}

module.exports = Premium;
