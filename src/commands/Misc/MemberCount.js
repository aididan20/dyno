'use strict';

const { Command } = require('@dyno.gg/dyno-core');

class MemberCount extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['membercount'];
		this.group = 'Misc';
		this.description = 'Get the server member count.';
		this.usage = 'membercount';
		this.cooldown = 10000;
		this.expectedArgs = 0;
	}

	async execute({ message, args }) {
		const guild = message.channel.guild;

		if (args.length && (args.includes('full') || args.includes('withprune')) && this.isServerMod(message.member, message.channel)) {
			try {
				var pruneCount = await this.client.getPruneCount(guild.id, 30);
			} catch (err) {
				// pass
			}
		}

		if (args.length && (args.includes('full') || args.includes('withbans')) && this.isServerMod(message.member, message.channel)) {
			try {
				let bans = await this.client.getGuildBans(guild.id);
				var banCount = bans.length;
			} catch (err) {
				// pass
			}
		}

		let fields = [
			{ name: 'Members', value: guild.memberCount.toString(), inline: true },
			{ name: 'Humans', value: guild.members.filter(m => !m.bot).length.toString(), inline: true },
			{ name: 'Bots', value: guild.members.filter(m => m.bot).length.toString(), inline: true },
		]

		if (this.config.isPremium) {
			fields.push({ name: 'Online', value: guild.members.filter(m => m.status !== 'offline').length.toString(), inline: true });
		}

		if (pruneCount) {
			fields.push({ name: 'Prune Count', value: pruneCount.toString(), inline: true });
		}

		if (banCount) {
			fields.push({ name: 'Bans', value: banCount.toString(), inline: true });
		}

		const embed = {
			color: this.utils.getColor('blue'),
			fields: fields,
			timestamp: new Date(),
		};

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = MemberCount;
