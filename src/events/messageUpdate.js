'use strict';

const { utils } = require('@dyno.gg/dyno-core');

module.exports = function messageUpdate(dispatcher, message, oldMessage) {
	if (!dispatcher.dyno.isReady || (message.author && message.author.bot)) return Promise.reject();
	if (!message.channel.guild) return Promise.reject();

	if (dispatcher.config.handleRegion && !utils.regionEnabled(message.channel.guild, dispatcher.config)) return Promise.reject();

	return new Promise((resolve, reject) => {
		dispatcher.dyno.guilds.getOrFetch(message.channel.guild.id).then(guildConfig => resolve({
				message: message,
				oldMessage: oldMessage,
				guild: message.channel.guild,
				guildConfig: guildConfig,
				isAdmin: dispatcher.dyno.permissions.isAdmin(message.author),
			})).catch(() => reject());
	});
};
