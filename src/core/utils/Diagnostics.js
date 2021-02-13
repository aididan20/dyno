class Diagnostics {
	constructor(dyno) {
		this.dyno = dyno;
	}

	async diagnose(guildId, name) {
		const guild = this.dyno.client.guilds.get(guildId);
		const guildConfig = await this.dyno.guilds.getOrFetch(guildId);

		if (!guild || !guildConfig) {
			return `I can't find that guild`;
		}

		name = name.toLowerCase();

		const command = this.dyno.commands.find((c) => c.name === name && c.permissions !== 'admin');

		if (command) {
			return this.diagnoseCommand(command, guild, guildConfig);
		}

		const mod = this.dyno.modules.find((m) => !m.core &&
			(m.module.toLowerCase() === name ||
				(m.friendlyName && m.friendlyName.toLowerCase() === name)));

		if (mod) {
			return this.diagnoseModule(mod, guild, guildConfig);
		}

		return `I can't find a command or module by that name.`;
	}

	diagnoseDefault(guild, guildConfig, perms) {
		const permissions = ['readMessages', 'sendMessages', 'embedLinks', 'externalEmojis'];
		const diagnosis = { info: [], issues: [] };

		diagnosis.info.push(`The prefix for this server is \`${guildConfig.prefix || '?'}\``);

		if (guildConfig.modonly) {
			diagnosis.info.push(`Make commands mod-only is enabled.`);
		}

		const clientMember = guild.members.get(this.dyno.client.user.id);

		if (!clientMember.roles || !clientMember.roles.length) {
			diagnosis.issues.push(`Dyno does not have a role, it should have atleast the Dyno role.`);
			diagnosis.issues.push(`You can fix this by authorizing the bot here: https://dyno.gg/invite`);
		}

		for (const perm of permissions) {
			if (!clientMember.permission.has(perm)) {
				const permission = this.dyno.config.permissionsMap[perm];
				diagnosis.issues.push(`The Dyno role is missing the ${permission} permission.`);
			}
		}

		if (perms && clientMember.roles && clientMember.roles.length) {
			const highestRole = this.dyno.utils.highestRole(guild, clientMember);
			if (highestRole && highestRole.position === 1) {
				diagnosis.issues.push(`The Dyno role has not been moved, move it up in the list above other user roles.`);
			}
		}

		return diagnosis;
	}

	// tslint:disable-next-line:cyclomatic-complexity
	diagnoseCommand(command, guild, guildConfig) {
		const globalConfig = this.dyno.globalConfig;
		const module = command.module || command.group;
		const diagnosis = this.diagnoseDefault(guild, guildConfig, command.requiredPermissions) ||
			{ info: [], issues: [] };

		const name = command.name;

		if (command.permissions === 'serverAdmin') {
			diagnosis.info.push(`The command requires Manage Server permissions.`);
		}

		if (command.permissions === 'serverMod') {
			diagnosis.info.push(`The command requires Moderator permissions.`);
		}

		if (globalConfig && globalConfig.commands && globalConfig.commands.hasOwnProperty(name) &&
			globalConfig.commands[name] === false) {
			diagnosis.issues.push(`The command is globally disabled in Dyno by the developer.`);
		}

		if (globalConfig && globalConfig.modules && globalConfig.modules.hasOwnProperty(module) &&
			globalConfig.modules[module] === false) {
			diagnosis.issues.push(`The ${module} module is globally disabled in Dyno by the developer.`);
		}

		if (guildConfig.commands[name] === false) {
			diagnosis.issues.push(`The command is disabled.`);
		}

		if (typeof guildConfig.commands[name] !== 'boolean' && guildConfig.commands[name].enabled === false) {
			diagnosis.issues.push(`The command is disabled.`);
		}

		if (this.dyno.modules.has(module) &&
			(guildConfig.modules.hasOwnProperty(module) && guildConfig.modules[module] === false)) {
			diagnosis.issues.push(`The ${module} module is disabled. Enable it to use this command.`);
		} else if (this.dyno.modules.has(module)) {
			diagnosis.info.push(`The command uses the ${module} module, which is enabled.`);
		}

		if (command.requiredPermissions) {
			const clientMember = guild.members.get(this.dyno.client.user.id);
			for (const perm of command.requiredPermissions) {
				if (!clientMember.permission.has(perm)) {
					const permission = this.dyno.config.permissionsMap[perm];
					diagnosis.issues.push(`The Dyno role is missing the **${permission}** permission.`);
				}
			}
		}

		const embed = {
			color: null,
			description: null,
			title: `Diagnosis: ${name}`,
			fields: [],
		};

		if (diagnosis.info.length) {
			embed.fields.push({ name: 'Info', value: diagnosis.info.join('\n'), inline: false });
		}

		if (diagnosis.issues.length) {
			embed.color = this.dyno.utils.getColor('orange');
			embed.fields.push({ name: 'Issues', value: diagnosis.issues.join('\n'), inline: false });
		} else {
			embed.color = this.dyno.utils.getColor('green');
			embed.description = 'There are no apparent issues with this command';
		}

		return { embed };
	}

	diagnoseModule(module, guild, guildConfig) {
		const globalConfig = this.dyno.globalConfig;
		let diagnosis = this.diagnoseDefault(guild, guildConfig, module.perms) || { info: [], issues: [] };

		const name = module.module || module.name;

		if (globalConfig && globalConfig.modules && globalConfig.modules.hasOwnProperty(name) &&
			globalConfig.modules[name] === false) {
			diagnosis.issues.push(`The module is globally disabled in Dyno by the developer.`);
		}

		if (guildConfig.modules.hasOwnProperty(name) && guildConfig.modules[name] === false) {
			diagnosis.issues.push(`The module is disabled on this server.`);
		} else {
			diagnosis.info.push(`The module is enabled on this server.`);
		}

		if (module.permissions) {
			const clientMember = guild.members.get(this.dyno.client.user.id);
			for (const perm of module.permissions) {
				if (!clientMember.permission.has(perm)) {
					const permission = this.dyno.config.permissionsMap[perm];
					diagnosis.issues.push(`The Dyno role is missing the **${permission}** permission.`);
				}
			}
		}

		if (module.diagnose) {
			diagnosis = module.diagnose({ guild, guildConfig, diagnosis });
		}

		const embed = {
			color: null,
			description: null,
			title: `Diagnosis: ${name}`,
			fields: [],
			footer: {
				// tslint:disable-next-line:max-line-length
				text: `${this.dyno.config.stateName} | Cluster ${this.dyno.options.clusterId} | Shard ${guild.shard.id} | ID ${guild.id}`,
			},
		};

		if (diagnosis) {
			if (diagnosis.info.length) {
				embed.fields.push({ name: 'Info', value: diagnosis.info.join('\n'), inline: false });
			}

			if (diagnosis.issues.length) {
				embed.color = this.dyno.utils.getColor('orange');
				embed.fields.push({ name: 'Issues', value: diagnosis.issues.join('\n'), inline: false });
			} else {
				embed.color = this.dyno.utils.getColor('green');
				embed.description = 'There are no apparent issues with this module';
			}
		}

		return { embed };
	}
}

module.exports = Diagnostics;
