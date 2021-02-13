'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class UpdateTeam extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'updateteam';
		this.aliases      = ['updateteam'];
		this.group        = 'Admin';
		this.description  = 'Update team data for the website';
		this.usage        = 'updateteam';
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.expectedArgs = 0;
	}

	parseUser(user, size) {
		return {
			id: user.id,
			name: `${user.username}#${user.discriminator}`,
			avatar: user.dynamicAvatarURL(null, size),
		};
	}

	hasRole(member, roleId) {
		if (!member.roles.includes(roleId)) {
			return false;
		}

		const roleIds = [
			'203040224597508096',
			'250182695693320193',
			'231095149508296704',
			'225209883828420608',
			'355054563931324420'
		];
		const roleIndex = roleIds.indexOf(roleId);
		const excludeIds = roleIds.filter(id => roleIds.indexOf(id) < roleIndex);

		return !excludeIds.filter(id => member.roles.includes(id)).length;
	}

	updateCoreMember(members, user) {
		let member = members.find(m => m.id === user.id);
		user = Object.assign(user, member);
		return user;
	}

	async execute({ message, args }) {
		const guild = message.channel.guild;
		const roles = {
			contributors: guild.members
				.filter(m => this.hasRole(m, '250182695693320193'))
				.map(m => this.parseUser(m.user, 128))
				.sort((a, b) => a.id - b.id),
			moderators: guild.members
				.filter(m => this.hasRole(m, '231095149508296704'))
				.map(m => this.parseUser(m.user, 128))
				.sort((a, b) => a.id - b.id),
			accomplices: guild.members
				.filter(m => this.hasRole(m, '225209883828420608'))
				.map(m => this.parseUser(m.user, 128))
				.sort((a, b) => a.id - b.id),
			support: guild.members
				.filter(m => this.hasRole(m, '355054563931324420'))
				.map(m => this.parseUser(m.user, 128))
				.sort((a, b) => a.id - b.id),
		};

		const coreMembers = guild.members
			.filter(m => m.roles.includes('203040224597508096'))
			.map(m => this.parseUser(m.user, 256));

		try {
			const globalConfig = await this.models.Dyno.findOne({}, { team: 1 }).lean().exec();
			for (let [key, val] of Object.entries(roles)) {
				globalConfig.team[key] = val;
			}
			globalConfig.team.core = globalConfig.team.core.map(user => this.updateCoreMember(coreMembers, user));

			await this.models.Dyno.update({}, { $set: { team: globalConfig.team } });

			return this.success(message.channel, 'Updated team members.');
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'An error occurred.');
		}
	}
}

module.exports = UpdateTeam;
