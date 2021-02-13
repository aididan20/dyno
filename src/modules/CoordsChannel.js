'use strict';

const { Module } = require('@dyno.gg/dyno-core');

/**
 * CoordsChannel Module
 * @class CoordsChannel
 * @extends Module
 */
class CoordsChannel extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'CoordsChannel';
		this.friendlyName = 'Coords Channel Mod';
		this.description = 'Auto delete non-coords messages in coords channels.';
		this.enabled = false;
		this.hasPartial = true;

		this.permissions = ['manageMessages'];
	}

	static get name() {
		return 'CoordsChannel';
	}

	get settings() {
		return {
			channels: { type: Array, default: [] },
			logChannel: { type: String },
		};
	}

	start() {
		this._floatRegex = new RegExp('[+-]?([0-9]*[.])[0-9]+', 'g');
	}

	/**
	 * Log deleted message or ban
	 * @param {Message} message Message object
	 * @param {String} msgContent Message content
	 * @param {String} reason Reason for deleting/banning
	 * @returns {void}
	 */
	log(message, msgContent, reason, guildConfig) {
		if (!guildConfig || !guildConfig.coordschannel.logChannel) return;

		const logChannel = this.client.getChannel(guildConfig.coordschannel.logChannel);

		if (!logChannel) return;

		let text = `Deleted message from ${this.utils.fullName(message.author)} in ${message.channel.mention} for ${reason}`;
		if (msgContent.length) text += '\n```' + msgContent + '```';

		this.sendMessage(logChannel, text);
	}

	/**
	 * Handle new message
	 * @param {Message} message Message object
	 * @returns {void}
	 */
	messageCreate({ message, guildConfig }) {
		if (!message.author || message.author.bot || !message.member) return;
		if (message.isPrivate) return;

		// const guildConfig = await this.dyno.guilds.getOrFetch(message.channel.guild.id);
		if (!guildConfig) return;

		if (!this.isEnabled(message.channel.guild, this, guildConfig)) return;
		if (!this.hasPermissions(message.channel.guild, 'manageMessages')) return;

		const coordsConfig = guildConfig.coordschannel;

		if (!guildConfig || !coordsConfig || !coordsConfig.channels || !coordsConfig.channels.length) {
			return;
		}

		if (!coordsConfig.channels.find(c => c.id === message.channel.id)) return;

		const floatMatch = message.content.match(this._floatRegex);

		if (!floatMatch || !floatMatch.length) {
			message.delete()
				.then(() => this.log(message, message.content, 'talking in coords channel', guildConfig))
				.catch(err => err);
		}
	}
}

module.exports = CoordsChannel;
