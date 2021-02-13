'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Discrim extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['discrim'];
		this.group = 'Misc';
		this.description = 'Gets a list of users with a discriminator';
		this.usage = 'discrim 1234';
		this.cooldown = 6000;
		this.expectedArgs = 0;
	}

	execute({ message, args }) {
		const discrim = args.length ? args[0] : message.author.discriminator;
		let users = this.client.users.filter(u => u.discriminator === discrim)
			.map(u => this.utils.fullName(u));

		if (!users || !users.length) {
			return this.error(`I couldn't find any results for ${discrim}`);
		}

		users = users.slice(0, 10);

		return this.sendMessage(message.channel, { embed: {
			color: parseInt(('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6), 16),
			description: users.join('\n'),
		} });
	}
}

module.exports = Discrim;
