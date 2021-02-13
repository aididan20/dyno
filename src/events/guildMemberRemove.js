'use strict';

const { utils } = require('@dyno.gg/dyno-core');

module.exports = function guildMemberRemove(dispatcher, guild, member) {
	if (!dispatcher.dyno.isReady || !guild || !member) return Promise.reject();

	if (dispatcher.config.handleRegion && !utils.regionEnabled(guild, dispatcher.config)) return Promise.reject();

	return new Promise((resolve, reject) => {
		dispatcher.dyno.guilds.getOrFetch(guild.id).then(guildConfig => resolve({
				guild: guild,
				member: member,
				guildConfig: guildConfig,
			})).catch(() => reject());
	});
};
