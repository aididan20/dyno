'use strict';

const { Module } = require('@dyno.gg/dyno-core');

/**
 * DynoManager module
 * @class DynoManager
 * @extends Module
 */
class DynoManager extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'DynoManager';
		this.description = 'Dyno manager.';
		this.core = true;
		this.list = false;
		this.enabled = true;
		this.hasPartial = false;
	}

	static get name() {
		return 'DynoManager';
	}

	guildCreate(guild) {
		if (!this.config.isCore) return;
		const clients = this.globalConfig.clients;
		if (!clients || !clients.length) return;
		for (let client of clients) {
			if (client.userid === this.config.client.id) continue;
			if (guild.members.has(client.userid)) {
				this.client.leaveGuild(guild.id);
			}
		}
	}
}
