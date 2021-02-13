'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Username extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['username', 'un'];
		this.group = 'Admin';
		this.description = 'Change the bot username.';
		this.usage = 'username [new username]';
		this.permissions = 'admin';
		this.extraPermissions = [this.config.owner || this.config.admin];
		this.expectedArgs = 1;
	}

	execute({ message, args }) {
		return this.client.editSelf({ username: args.join(' ') })
			.then(() => this.success(message.channel, `Username changed to ${args.join(' ')}`))
			.catch(() => this.error(message.channel, 'Unable to change username.'));
	}
}

module.exports = Username;
