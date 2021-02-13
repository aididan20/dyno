'use strict';

const { Module } = require('@dyno.gg/dyno-core');
const each = require('async-each');

/**
 * Carbon Module
 * @class Carbon
 * @extends Module
 */
class CommandHandler extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'CommandHandler';
		this.enabled = true;
		this.core = true;
		this.list = false;
	}

	static get name() {
		return 'CommandHandler';
	}

	start() {
		this.cooldowns = new Map();
		this.dmCooldowns = new Map();

		this.cooldown = 900;
		this.dmCooldown = 10000;

		this.commandLog = [];

		this.schedule('*/1 * * * *', this.clearCooldowns.bind(this));

		this.footer = [
			`**Additional links and help**\n`,
			`[All Commands](${this.config.site.host}/commands)`,
			`[Dyno Discord](${this.config.site.host}/discord)`,
			`[Add To Your Server](${this.config.site.host}/invite)`,
			`[Donate](${this.config.site.host}/donate)`,
		];
	}

	crashReport() {
		return this.commandLog.join('\n');
	}

	clearCooldowns() {
		each([...this.cooldowns.keys()], id => {
			let time = this.cooldowns.get(id);
			if ((Date.now() - time) < this.cooldown) return;
			this.cooldowns.delete(id);
		});
		each([...this.dmCooldowns.keys()], id => {
			let time = this.dmCooldowns.get(id);
			if ((Date.now() - time) < this.dmCooldown) return;
			this.dmCooldowns.delete(id);
		});
	}

	logCommand(logEntry) {
		this.commandLog.unshift(logEntry);
		this.commandLog = this.commandLog.slice(0,20);
	}

	handleDM({ message }) {
		if (this.config.test || this.config.beta) return;

		const cooldown = this.dmCooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) < this.dmCooldown) return;
		this.dmCooldowns.set(message.author.id, Date.now());

		let msgArray = [];

		msgArray.push('**Commands are disabled in DM.**\n');
		msgArray.push('Use commands **in a server**, type **`?help`** for a list of commands.\n');
		msgArray = msgArray.concat(this.footer);

		return this.client.getDMChannel(message.author.id).then(channel => {
			if (!channel) {
				this.logger.error('Channel is undefined or null - ' + this.client.privateChannelMap[message.author.id]);
			}
			this.sendMessage(channel, { embed: { description: msgArray.join('\n') } });
		});
	}

	canExecute(command, e) {
		const { message, guildConfig, isAdmin, isOverseer } = e;
		const isServerAdmin = this.isServerAdmin(message.member, message.channel);
		const isServerMod   = this.isServerMod(message.member, message.channel);

		let hasPermission = true;
		let isMod = isServerMod || isServerAdmin || isOverseer;

		if (isAdmin) return true;

		const globalConfig = this.dyno.globalConfig || {};
		if (globalConfig.ignoredUsers && globalConfig.ignoredUsers.includes(message.author.id)) {
			return false;
		}

		if (!isMod && guildConfig.ignoredChannels && guildConfig.ignoredChannels.includes(message.channel.id)) {
			return false;
		}
		if (!isMod && guildConfig.ignoredUsers && guildConfig.ignoredUsers.find(u => u.id === message.author.id)) {
			return false;
		}
		if (!isMod && guildConfig.ignoredRoles && message.member && message.member.roles &&
			guildConfig.ignoredRoles.find(r => message.member.roles.includes(r))) {
				return false;
		}

		// check if commands are mod only in the guildConfig, ignore music
		if (command.group !== 'Music' && (guildConfig.modonly && !isServerMod)) hasPermission = false;
		// check serverAdmin permissions
		if (command.permissions === 'serverAdmin' && !isServerAdmin) hasPermission = false;
		// check serverMod permissions
		if (command.permissions === 'serverMod' && !isServerMod) hasPermission = false;
		// ignore admin commands for users without rights
		if (command.permissions === 'admin' && !isAdmin) hasPermission = false;

		if (!isServerAdmin) {
			const shouldOverride = this.commandEnabled(e, command);
			if (typeof shouldOverride === 'boolean') {
				hasPermission = shouldOverride;
			}
		}

		if (command.overseerEnabled && isOverseer) {
			if (hasPermission !== true) {
				this.logOverride(message, command);
			}
			return true;
		}

		if (command.permissionsFn && command.permissionsFn({ message })) {
			return true;
		}

		return hasPermission;
	}

	commandEnabled(e, command) {
		const { message, guildConfig } = e;

		if (command.permissions === 'admin') {
			return;
		}

		const commandOpts = guildConfig.commands[command.name];
		if (!commandOpts) {
			return;
		}

		if (commandOpts.ignoredChannels) {
			if (commandOpts.ignoredChannels.includes(message.channel.id)) {
				return false;
			}

			if (message.channel.parentID && commandOpts.ignoredChannels.includes(message.channel.parentID)) {
				return false;
			}
		}

		if (commandOpts.ignoredRoles && commandOpts.ignoredRoles.find(r => message.member.roles.includes(r))) {
			return false;
		}

		let hasPermissions;

		if (commandOpts.allowedRoles && commandOpts.allowedRoles.find(r => message.member.roles.includes(r))) {
			hasPermissions = true;
		}

		if (commandOpts.allowedChannels) {
			if (commandOpts.allowedChannels.includes(message.channel.id) ||
				(message.channel.parentID && commandOpts.allowedChannels.includes(message.channel.parentID))) {
					hasPermissions = true;
			}
		}

		if (commandOpts.allowedRoles && commandOpts.allowedRoles.length && !commandOpts.allowedRoles.find(r => message.member.roles.includes(r))) {
			hasPermissions = false;
		}

		if (commandOpts.allowedChannels && commandOpts.allowedChannels.length) {
			if (!commandOpts.allowedChannels.includes(message.channel.id) && !commandOpts.allowedChannels.includes(message.channel.parentID)) {
				hasPermissions = false;
			}
		}

		return hasPermissions;
	}

	shouldCooldown(message) {
		const cooldown = this.cooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) <= this.cooldown) return true;
		this.cooldowns.set(message.author.id, Date.now());
		return false;
	}

	/**
	 * Fired when the client receives a message
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	messageCreate(e) {
		const { message, guildConfig, isAdmin } = e;
		if (!message.author || message.author.bot) return;

		// handle DM's
		if (!message.channel.guild) return this.handleDM(e);
		if (!guildConfig) return;

		if (!this.config.isPremium && guildConfig.isPremium && guildConfig.premiumInstalled) {
			var livePrefix = guildConfig.livePrefix || null;
		}

		if (!this.config.test && message.guild.id !== this.config.dynoGuild) {
			// premium checks
			if (!this.config.isPremium && guildConfig.isPremium && guildConfig.premiumInstalled) {
				return false;
			}
			if (this.config.isPremium && (!guildConfig.isPremium || !guildConfig.premiumInstalled)) {
				return false;
			}
		}

		// if (!(this.config.isPremium || this.config.test) && guildConfig.clientID && this.config.client.id !== guildConfig.clientID) {
		// 	return false;
		// }

		if (this.config.handleRegion && !this.utils.regionEnabled(message.guild, this.config)) {
			return false;
		}

		const globalConfig = this.dyno.globalConfig,
			helpCmds = ['help', 'commands'],
			prefix = livePrefix || guildConfig.prefix || this.config.prefix,
			prefixes = [
				`<@${this.client.user.id}> `,
				`<@!${this.client.user.id}> `,
				prefix,
			];

		if (this.config.localPrefix) {
			prefixes.push(this.config.localPrefix);
		}

		let msgContent = message.content;
		const hasPrefix = prefixes.filter(p => message.content.startsWith(p));

		// ignore if it's not a prefixed command
		if (!(isAdmin && message.content.startsWith(this.config.sudopref)) && (!hasPrefix || !hasPrefix.length)) {
			return;
		}

		let cmd = message.content.replace(this.config.sudopref, '');

		for (let pref of prefixes) {
			cmd = cmd.replace(pref, '');
			msgContent = `${msgContent.replace(new RegExp(`^${this.utils.regEscape(pref)}`), '')}`;
		}

		cmd = cmd.split(' ')[0].toLowerCase();
		if (!cmd.length) return;

		if (this.shouldCooldown(message)) return;

		const commands = this.dyno.commands;

		// command doesn't exist
		if (helpCmds.indexOf(cmd) === -1 && !commands.has(cmd)) return;

		const args = msgContent.replace(/ {2,}/g, ' ').split(' ').slice(1);

		// generate and display help
		if (helpCmds.indexOf(cmd) > -1) {
			if (this.config.disableHelp) return;

			if (args.length && commands.has(args[0])) {
				const c = commands.get(args[0]);
				return c.help(message, guildConfig);
			}
			return this.generateHelp({ message, guildConfig, isAdmin });
		}

		// return help for default prefixes
		if (message.content.startsWith('?help')) {
			return this.generateHelp({ message, guildConfig, isAdmin });
		}

		// get the command
		const command = commands.get(cmd);
		const module = command.module || command.group;

		if (this.dyno.modules.has(module) &&
			(guildConfig.modules.hasOwnProperty(module) && guildConfig.modules[module] === false)) return;

		if (globalConfig && globalConfig.commands.hasOwnProperty(cmd) && globalConfig.commands[cmd] === false) {
			return;
		}

		if (globalConfig && globalConfig.modules.hasOwnProperty(module) && globalConfig.modules[module] === false) {
			return;
		}

		if (guildConfig.commands.hasOwnProperty(command.name)) {
			const commandOpts = guildConfig.commands[command.name];
			if (commandOpts === false || commandOpts.enabled === false) {
				return;
			}
		}

		const isOverseer = this.isOverseer(message.member);
		e.isOverseer = isOverseer;

		// check if user has permissions
		if (!this.canExecute(command, e)) return;

		const executeStart = Date.now();

		const logEntry = `[C${this.dyno.clientOptions.clusterId}] [G${message.channel.guild.id}] Command: ${JSON.stringify(message)}`;
		this.logCommand(logEntry);

		// execute command
		try {
			command._execute({
				message: message,
				args: args,
				command: cmd,
				guildConfig: guildConfig,
				isAdmin: isAdmin,
				isOverseer: isOverseer,
			})
			.then(() => {
				const time = Date.now() - executeStart;
				const isServerAdmin = this.isServerAdmin(message.member, message.channel);
				const isServerMod   = this.isServerMod(message.member, message.channel);
				commands.emit('command', { command, message, guildConfig, args, time, isServerAdmin, isServerMod });
			})
			.catch((err) => {
				const time = Date.now() - executeStart;
				commands.emit('error', { command, message, guildConfig, args, time });
			});
		} catch (err) {
			this.logger.error(err, {
				type: 'CommandHandler.command._execute',
				command: command.name,
				guild: message.channel.guild.id,
				shard: message.channel.guild.shard.id,
			});
		}
	}

	/**
	 * Generate help
	 * @param {Message} message Message object
	 */
	generateHelp({ message, guildConfig, isAdmin }) {
		if (this.config.disableHelp) return;

		let prefix = (guildConfig) ? guildConfig.prefix || this.config.prefix : this.config.prefix;

		return this.client.getDMChannel(message.author.id).then(channel => {
			if (!channel) {
				return this.logger.error('Channel is undefined or null - ' + this.client.privateChannelMap[message.author.id]);
			}

			return this.sendMessage(channel, {
					content: `The prefix for ${message.guild.name} is \`${prefix}\`\nYou can find a list of commands at <https://www.dynobot.net/commands>`,
					embed: { description: this.footer.join('\n') },
				})
				.then(() => {
					this.prom.register.getSingleMetric('dyno_app_messages_sent').inc({ type: 'dm' });
					this.prom.register.getSingleMetric('dyno_app_help_sent').inc();
				})
				.catch(() => this.prom.register.getSingleMetric('dyno_app_help_failed').inc());
		}).catch(err => {
			this.prom.register.getSingleMetric('dyno_app_help_failed').inc();
			this.logger.error(err);
		});
	}

	logOverride(message, command) {
		let doc = {
			guild: message.channel.guild.id,
			user: {
				id: message.author.id,
				name: message.author.username,
				discrim: message.author.discriminator,
			},
			command: command.name,
			message: message.cleanContent,
		};

		let log = new this.models.OverrideLog(doc);
		log.save(err => err ? this.logger.error(err) : false);
	}
}

module.exports = CommandHandler;
