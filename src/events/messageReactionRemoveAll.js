'use strict';

const { utils } = require('@dyno.gg/dyno-core');

module.exports = function messageReactionRemoveAll(dispatcher, message) {
	if (!dispatcher.dyno.isReady || (message.author && message.author.bot)) return Promise.reject();
	if (!message.channel.guild) return Promise.reject();

	if (dispatcher.config.handleRegion && !utils.regionEnabled(message.channel.guild, dispatcher.config)) return Promise.reject();

	const guildConfig = dispatcher.dyno.guilds.get(message.channel.guild.id);
	if (guildConfig) {
		return Promise.resolve({
			message: message,
			guild: message.channel.guild,
			guildConfig: guildConfig,
			isAdmin: dispatcher.dyno.permissions.isAdmin(message.author),
		});
	}

	return dispatcher.dyno.guilds.getOrFetch(message.channel.guild.id).then(guildConfig => { // eslint-disable-line
		return {
			message: message,
			guild: message.channel.guild,
			guildConfig: guildConfig,
			isAdmin: dispatcher.dyno.permissions.isAdmin(message.author),
		};
	});
};
