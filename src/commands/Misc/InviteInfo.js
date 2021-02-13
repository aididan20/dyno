'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class InviteInfo extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['inviteinfo'];
		this.group = 'Misc';
		this.description = 'Get information about an invite';
		this.usage = 'inviteinfo [code or invite]';
		this.cooldown = 6000;
		this.hideFromHelp = true;
		this.expectedArgs = 1;

		this._inviteRegex = new RegExp('(discordapp.com/invite|discord.me|discord.gg)(?:/#)?(?:/invite)?/([a-zA-Z0-9\-]+)'); // eslint-disable-line
	}

	async execute({ message, args }) {
		const match = args.join(' ').match(this._inviteRegex);

		let code = match ? match.pop() : args[0];

		if (!match && !code) {
			return this.error(`Invalid code or link.`);
		}

		try {
			var invite = await this.client.getInvite(code, true);
		} catch (err) {
			return this.error(message.channel, `Invalid code or link.`);
		}

		if (!invite) {
			return this.error(message.channel, `I can't get that invite.`);
		}

		const embed = {
			color: this.utils.getColor('blue'),
			author: {
				name: invite.guild.name,
				icon_url: `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.jpg?size=128`,
			},
			fields: [],
			footer: { text: `ID: ${invite.guild.id}` },
		};

		if (invite.inviter) {
			embed.fields.push({ name: 'Inviter', value: this.utils.fullName(invite.inviter), inline: true });
		}

		if (invite.channel) {
			embed.fields.push({ name: 'Channel', value: `#${invite.channel.name}`, inline: true });
		}

		if (invite.memberCount) {
			if (invite.presenceCount) {
				embed.fields.push({ name: 'Members', value: `${invite.presenceCount}/${invite.memberCount}`, inline: true });
			} else {
				embed.fields.push({ name: 'Members', value: `${invite.memberCount}`, inline: true });
			}
		}

		if (message.guild.id === this.config.dynoGuild) {
			try {
				var inviteGuild = await this.models.Server.findOne({ _id: invite.guild.id }, { deleted: 1, ownerID: 1 }).lean().exec();
			} catch (err) {
				// pass
			}

			if (inviteGuild) {
				embed.fields.push({ name: 'Dyno', value: inviteGuild.deleted === true ? 'Kicked' : 'In Server', inline: true });

				if (inviteGuild.ownerID) {
					var owner = this.client.users.get(inviteGuild.ownerID);
					if (!owner) {
						owner = await this.restClient.getRESTUser(inviteGuild.ownerID);
					}

					if (owner) {
						embed.fields.push({ name: 'Owner', value: this.utils.fullName(owner), inline: true });
					}
				}
			} else {
				embed.fields.push({ name: 'Dyno', value: 'Never Added', inline: true });
			}
		}

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = InviteInfo;
