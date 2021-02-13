'use strict';

const { Module } = require('@dyno.gg/dyno-core');

/**
 * Carbon Module
 * @class Carbon
 * @extends Module
 */
class AdminHandler extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'AdminHandler';
		this.enabled = true;
		this.core = true;
		this.list = false;
	}

	static get name() {
		return 'AdminHandler';
	}

	start() {
		this.boundListener = this.preMessage.bind(this);
		this.client.on('messageCreate', this.boundListener);
	}

	unload() {
		this.client.removeListener('messageCreate', this.boundListener);
	}

	preMessage(message) {
		if (!message.channel.guild || !message.author || message.author.bot) return;

		const isAdmin = this.isAdmin(message.author);
		const isOverseer = this.isOverseer(message.author);
		if (!isAdmin && !isOverseer) return;

		this.dyno.guilds.getOrFetch(message.channel.guild.id)
			.then(guildConfig => this.onMessage({ message, guildConfig, isOverseer }));
	}

	/**
	 * Fired when the client receives a message
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	onMessage({ message, guildConfig, isOverseer }) {
		if (!guildConfig) return;

		const params = message.content.split(' ');

		// ignore if it's not a prefixed command
		if (!params.join(' ').startsWith(this.config.adminPrefix)) return;

		const cmd = params[0].replace(this.config.adminPrefix, '').toLowerCase();

		if (!cmd.length) return false;

		const commands = this.dyno.commands;

		// command doesn't exist
		if (!commands.has(cmd)) return;

		const args = message.content.replace(/ {2,}/g, ' ').split(' ').slice(1);

		// get the command
		const command = commands.get(cmd);

		if (isOverseer && command.permissions && !command.overseerEnabled) return;

		// execute command
		command._execute({
			message: message,
			args: args,
			command: cmd,
			guildConfig: guildConfig,
		}).catch(() => false);
	}
}

module.exports = AdminHandler;
