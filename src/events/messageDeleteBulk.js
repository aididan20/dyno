'use strict';

const { utils } = require('@dyno.gg/dyno-core');

module.exports = function messageDeleteBulk(dispatcher, messages) {
	if (!dispatcher.dyno.isReady) return Promise.reject();
	if (!messages[0] || !messages[0].channel || !messages[0].channel.guild) return Promise.reject();

	if (dispatcher.config.handleRegion && !utils.regionEnabled(messages[0].channel.guild, dispatcher.config)) return Promise.reject();

	return new Promise((resolve, reject) => {
		dispatcher.dyno.guilds.getOrFetch(messages[0].channel.guild.id).then(guildConfig => resolve({
				messages: messages,
				channel: messages[0].channel,
				guild: messages[0].channel.guild,
				guildConfig: guildConfig,
			})).catch(() => reject());
	});
};
