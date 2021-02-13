'use strict';

const { utils } = require('@dyno.gg/dyno-core');

module.exports = function guildRoleUpdate(dispatcher, guild, role, oldRole) {
	if (!dispatcher.dyno.isReady || !guild || !role) return Promise.reject();

	if (dispatcher.config.handleRegion && !utils.regionEnabled(guild, dispatcher.config)) return Promise.reject();

	return new Promise((resolve, reject) => {
		dispatcher.dyno.guilds.getOrFetch(guild.id).then(guildConfig => resolve({
				guild: guild,
				role: role,
				oldRole: oldRole,
				guildConfig: guildConfig,
			})).catch(() => reject());
	});
};
