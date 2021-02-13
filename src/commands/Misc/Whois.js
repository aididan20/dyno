'use strict';

const moment = require('moment');
const {Command} = require('@dyno.gg/dyno-core');

class Whois extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['whois', 'userinfo'];
		this.group        = 'Misc';
		this.description  = 'Get user information.';
		this.usage        = 'whois [user mention]';
		this.example      = 'whois @NoobLance';
		this.cooldown     = 3000;
		this.expectedArgs = 0;
	}

	execute({ message, args }) {
		let member = args.length ? this.resolveUser(message.channel.guild, args.join(' ')) : message.member;

		if (!member) return this.error(message.channel, `Couldn't find user ${args.join(' ')}`);

		const perms = {
			administrator: 'Administrator',
			manageGuild: 'Manage Server',
			manageRoles: 'Manage Roles',
			manageChannels: 'Manage Channels',
			manageMessages: 'Manage Messages',
			manageWebhooks: 'Manage Webhooks',
			manageNicknames: 'Manage Nicknames',
			manageEmojis: 'Manage Emojis',
			kickMembers: 'Kick Members',
			banMembers: 'Ban Members',
			mentionEveryone: 'Mention Everyone',
		};

		const contrib = this.dyno.globalConfig.contributors.find(c => c.id === member.id);
		const extra = [];
		let team = [];

		const roles = member.roles && member.roles.length ?
			this.utils.sortRoles(member.roles.map(r => {
				r = message.channel.guild.roles.get(r);

				if (!r || !r.id) {
					return 'Invalid role.';
				}

				return `<@&${r.id}>`;
			})).join('  ') : 'None';

		const joinPos = [...message.guild.members.values()]
			.sort((a, b) => (a.joinedAt < b.joinedAt) ? -1 : ((a.joinedAt > b.joinedAt) ? 1 : 0))
			.filter(m => !m.bot)
			.findIndex(m => m.id === member.id) + 1;

		const embed = {
			author: {
				name: this.utils.fullName(member),
				icon_url: member.user.avatarURL,
			},
			thumbnail: {
				url: (contrib && contrib.badge) ?
					`https://cdn.dyno.gg/badges/${contrib.badge}` :
					member.user.avatarURL,
			},
			description: `\n<@!${member.id}>`,
			fields: [
				// { name: 'Status', value: member.status, inline: true },
				{ name: 'Joined', value: moment.unix(member.joinedAt / 1000).format('llll'), inline: true },
				{ name: 'Join Position', value: joinPos || 'None', inline: true },
				{ name: 'Registered', value: moment.unix(member.user.createdAt / 1000).format('llll'), inline: true },
				{ name: `Roles [${member.roles.length}]`, value: roles.length > 1024 ? `Too many roles to show.` : roles, inline: false },
			],
			footer: { text: `ID: ${member.id}` },
			timestamp: new Date(),
		};

		if (member.permission) {
			const memberPerms = member.permission.json;
			const infoPerms = [];
			for (let key in memberPerms) {
				if (!perms[key] || memberPerms[key] !== true) continue;
				if (memberPerms[key]) {
					infoPerms.push(perms[key]);
				}
			}

			if (infoPerms.length) {
				embed.fields.push({ name: 'Key Permissions', value: infoPerms.join(', '), inline: false });
			}
		}

		if (member.id === this.client.user.id) {
			team.push('A Real Dyno');
		}
		// if (this.isAdmin(member)) extra.push(`Dyno Creator`);

		if (contrib) {
			team = team.concat(contrib.titles);
		}

		if (this.isServerAdmin(member, message.channel)) {
			if (member.id === message.channel.guild.ownerID) {
				extra.push(`Server Owner`);
			} else if (member.permission.has('administrator')) {
				extra.push(`Server Admin`);
			} else {
				extra.push(`Server Manager`);
			}
		} else if (this.isServerMod(member, message.channel)) {
			extra.push(`Server Moderator`);
		}

		if (extra.length) {
			embed.fields.push({ name: 'Acknowledgements', value: extra.join(', '), inline: false });
		}

		if (team.length) {
			embed.fields.push({ name: 'Dyno Team', value: `${team.join(', ')}`, inline: false });
		}

		return this.sendMessage(message.channel, { embed }).catch(err => this.logger.error(err));
	}
}

module.exports = Whois;
