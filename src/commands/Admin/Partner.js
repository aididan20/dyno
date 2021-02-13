'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Partner extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['partner'];
		this.group        = 'Admin';
		this.description  = 'Create a partner invite/id';
		this.usage        = 'partner';
		this.permissions  = 'admin';
		this.overseerEnabled = true;
		this.expectedArgs = 0;
	}

	async execute({ message }) {
		const channel = message.channel.guild.channels.find(c => c.name === 'welcome');

		if (!channel) {
			return this.error(message.channel, `I can't find the welcome channel.`);
		}

		return this.client.createChannelInvite(channel.id, { temporary: false, unique: true, maxAge: 0 })
			.catch(err => this.error(message.channel, err))
			.then(invite => {
				const content = [
					`ID: ${invite.code}`,
					`Invite: https://discord.gg/${invite.code}`,
					`Website: https://www.dynobot.net/?r=${invite.code}`,
				];

				this.sendMessage(message.channel, content);
			});
	}
}

module.exports = Partner;
