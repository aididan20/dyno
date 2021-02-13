'use strict';

const eris = require('@dyno.gg/eris');
const { Module } = require('@dyno.gg/dyno-core');
const { Permissions } = eris.Constants;

class Premium extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'Premium';
		this.description = 'Premium helper module.';
		this.core = true;
		this.list = false;
		this.enabled = true;
		this.hasPartial = false;
	}

	static get name() {
		return 'Premium';
	}

	async guildRoleCreate({ guild, role, guildConfig }) {
		// if (this.config.isPremium || this.config.beta) return;
		if (this.config.isPremium || this.config.beta || this.config.test) return;
		if (role.name !== 'Dyno Premium' || role.managed !== true) return;
		if (!guildConfig.isPremium) return;

		await new Promise(res => setTimeout(res, 2000));

		const premiumMember = guild.members.get('168274283414421504');
		if (!premiumMember) return;

		const clientMember = guild.members.get(this.dyno.user.id);
		if (!clientMember) return;

		const dynoRole = guild.roles.find(r => r.name === 'Dyno' && r.managed === true);
		if (!dynoRole || !dynoRole.position) return;

		let textPerms = ['readMessages', 'sendMessages', 'embedLinks', 'externalEmojis'],
			voicePerms = ['voiceConnect', 'voiceSpeak', 'voiceUseVAD'];

		let pos = dynoRole.position - 1;

		this.client.editRolePosition(guild.id, role.id, pos).catch(err => this.logger.error(err.message));

		for (let channel of guild.channels.values()) {
			let dynoPerms = channel.permissionsOf(clientMember.id),
				premiumPerms = channel.permissionsOf(premiumMember.id);

			if (channel.type === 0) {
				if ((dynoPerms.has('readMessages') && !premiumPerms.has('readMessages')) ||
					(dynoPerms.has('sendMessages') && !premiumPerms.has('sendMessages'))) {
						let permInt = textPerms.reduce((a, b) => {
							a |= Permissions[b];
							return a;
						}, 0);
						channel.editPermission(role.id, permInt, 0, 'role').catch(() => false);
				}
			} else if (channel.type === 2) {
				if ((dynoPerms.has('voiceConnect') && !premiumPerms.has('voiceConnect')) ||
					(dynoPerms.has('voiceSpeak') && !premiumPerms.has('voiceSpeak'))) {
					let permInt = voicePerms.reduce((a, b) => {
						a |= Permissions[b];
						return a;
					}, 0);
					channel.editPermission(role.id, permInt, 0, 'role').catch(() => false);
				}
			}
		}

		this.dyno.guilds.update(guild.id, { $set: { premiumInstalled: true } });
	}
}

module.exports = Premium;
