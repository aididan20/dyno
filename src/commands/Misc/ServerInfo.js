'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class ServerInfo extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['serverinfo'];
		this.group        = 'Misc';
		this.description  = 'Get server info/stats.';
		this.usage        = 'serverinfo';
		this.cooldown     = 10000;
		this.expectedArgs = 0;
	}

	async execute({ message, args }) {
		const guild = (this.isAdmin(message.author) && args && args.length) ?
			this.client.guilds.get(args[0]) : message.channel.guild;

		const owner = this.client.users.get(guild.ownerID);

		let categories = guild.channels.filter(c => c.type === 4).length;
		let textChannels = guild.channels.filter(c => c.type === 0).length;
		let voiceChannels = guild.channels.filter(c => c.type === 2).length;

		const embed = {
			color: (Math.random() * (1 << 24) | 0),
			author: {
				name: guild.name,
				icon_url: guild.iconURL,
			},
			thumbnail: {
				url: `https://discordapp.com/api/guilds/${guild.id}/icons/${guild.icon}.jpg`,
			},
			fields: [
				{ name: 'Owner', value: this.utils.fullName(owner), inline: true },
				{ name: 'Region', value: guild.region, inline: true },
				{ name: 'Channel Categories', value: categories ? categories.toString() : '0', inline: true },
				{ name: 'Text Channels', value: textChannels ? textChannels.toString() : '0', inline: true },
				{ name: 'Voice Channels', value: voiceChannels ? voiceChannels.toString() : '0', inline: true },
				{ name: 'Members', value: guild.memberCount.toString(), inline: true },
				// { name: 'Emojis', value: guild.emojis.length.toString(), inline: true },
			],
			footer: {
				text: `ID: ${guild.id} | Server Created`,
			},
			timestamp: new Date(guild.createdAt),
		};

		embed.fields.push({ name: 'Humans', value: guild.members.filter(m => !m.bot).length.toString(), inline: true });
		embed.fields.push({ name: 'Bots', value: guild.members.filter(m => m.bot).length.toString(), inline: true });

		if (this.config.isPremium) {
			embed.fields.push({ name: 'Online', value: guild.members.filter(m => m.status !== 'offline').length.toString(), inline: true });
		}

		embed.fields.push({ name: 'Roles', value: guild.roles.size.toString(), inline: true });

		if (guild.roles.size < 25) {
			embed.fields.push({ name: 'Role List', value: guild.roles.map(r => r.name).join(', '), inline: false });
		}

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = ServerInfo;
