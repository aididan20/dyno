const { Command } = require('@dyno.gg/dyno-core');
const axios = require('axios');
const uuid = require('uuid/v4');

class Guild extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['guild'];
		this.group        = 'Admin';
		this.description  = 'Get guild status';
		this.usage        = 'guild [guild id]';
		this.cooldown     = 3000;
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.overseerEnabled = true;
		this.expectedArgs = 0;
	}

	permissionsFn({ message }) {
		if (message.guild.id === this.config.dynoGuild) return true;

		const allowedRoles = [
			'225209883828420608',
			'355054563931324420',
			'231095149508296704',
			'203040224597508096',
		];

		if (message.member && allowedRoles.find(r => message.member.roles.includes(r))) {
			return true;
		}

		return false;
	}

	async getGuild(guildId) {
		try {
			const options = {
				method: 'POST',
				headers: { Authorization: this.dyno.globalConfig.apiToken },
				url: `https://premium.dyno.gg/api/guild/${guildId}`,
			};

			const response = await axios(options);
			if (!response.data) {
				return Promise.reject('Unable to retrieve data at this time.');
			}
			return response.data;
		} catch (err) {
			return Promise.reject(err);
		}
	}

	async execute({ message, args }) {
		const guildId = args[0] || message.guild.id;
		let guild;

		try {
			guild = await this.getGuild(guildId);
		} catch (err) {
			return this.error(message.channel, err);
		}

		let payload = { guildId, userId: message.member.id };
		try {
			var uniqueId = uuid();
		} catch (err) {
			return this.error(message.channel, err);
		}

		if (!this.isServerMod(message.member, message.channel)) {
			payload.excludeKeys = ['customcommands', 'autoresponder'];
		}

		try {
			await this.redis.setex(`supportcfg:${uniqueId}`, 60, JSON.stringify(payload));
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, 'Something went wrong. Try again later.');
		}

		const url = `https://dyno.gg/support/c/${uniqueId}`;

		const shardCount = this.dyno.globalConfig.shardCount;
		const shard = ~~((guildId / 4194304) % shardCount);

		const desc = [
			{ key: 'Server', value: guild.serverName },
			{ key: 'Cluster', value: guild.cluster },
			{ key: 'Shard', value: `${shard}/${shardCount}` },
			{ key: 'Members', value: guild.memberCount.toString() },
			{ key: 'Region', value: guild.region },
			{ key: 'Prefix', value: guild.prefix || '?' },
			{ key: 'Mod Only', value: guild.modonly ? 'Yes' : 'No' },
			{ key: 'Owner', value: `${guild.owner.username}#${guild.owner.discriminator}\n(${guild.ownerID})` },
		];

		const color = guild.isPremium ? this.utils.getColor('premium') : this.utils.getColor('blue');

		let status;

		if (guild.server.result && guild.server.result.shardStatus) {
			const shardStatus = guild.server.result.shardStatus.find(s => s.id === shard);
			if (shardStatus.status === 'disconnected') {
				status = 'https://cdn.discordapp.com/emojis/313956276893646850.png?v=1';
			} else if (shardStatus.status === 'ready') {
				status = 'https://cdn.discordapp.com/emojis/313956277808005120.png?v=1';
			} else {
				status = 'https://cdn.discordapp.com/emojis/313956277220802560.png?v=1';
			}
		}

		const embed = {
			color,
			author: {
				name: guild.name,
				icon_url: guild.iconURL,
			},
			// description: ,
			fields: [
				{ name: 'Server', value: desc.map(o => `**${o.key}:** ${o.value}`).join('\n'), inline: true },
			],
			footer: { text: `ID: ${guild._id}` },
			timestamp: new Date(),
		};

		if (status) {
			embed.footer.icon_url = status;
		}

		if (guild.premiumUser) {
			const field = [
				{ key: 'Premium', value: guild.isPremium ? 'Yes' : 'No' },
				{ key: 'Premium Since', value: new Date(guild.premiumSince).toISOString().substr(0, 16) },
				{ key: 'Premium User', value: `${guild.premiumUser.username}#${guild.premiumUser.discriminator}\n(${guild.premiumUser.id})` },
				{ key: 'Premium Installed', value: guild.premiumInstalled ? 'Yes' : 'No' },
			];
			embed.fields.push({ name: 'Premium', value: field.map(o => `**${o.key}:** ${o.value}`).join('\n'), inline: true });
		}

		// START MODULES
		const modules = this.dyno.modules.filter(m => !m.admin && !m.core && m.list !== false);

		if (!modules) {
			return this.error(message.channel, `Couldn't get a list of modules.`);
		}

		const enabledModules = modules.filter(m => !guild.modules.hasOwnProperty(m.name) ||
			guild.modules[m.name] === true);
		const disabledModules = modules.filter(m => guild.modules.hasOwnProperty(m.name) &&
			guild.modules[m.name] === false);

		if (enabledModules.length) {
			embed.fields.push({ name: 'Enabled Modules', value: enabledModules.map(m => m.name).join(', '), inline: false });
		}
		if (disabledModules.length) {
			embed.fields.push({ name: 'Disabled Modules', value: disabledModules.map(m => m.name).join(', '), inline: false });
		}

		embed.fields.push({ name: '\u200b', value: `[Dashboard](https://dyno.gg/manage/${guild._id}) **|** [Config](${url})`, inline: true });

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Guild;
