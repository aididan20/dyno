'use strict';

const moment = require('moment');
const {Command} = require('@dyno.gg/dyno-core');

class DisablePremium extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'dispremium';
		this.aliases      = ['dispremium'];
		this.group        = 'Admin';
		this.description  = 'Disable premium for a server.';
		this.usage        = 'dispremium [server id] [reason]';
		this.overseerEnabled = true;
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	permissionsFn({ message }) {
		if (!message.member) return false;
		if (message.guild.id !== this.config.dynoGuild) return false;

		if (this.isServerAdmin(message.member, message.channel)) return true;
		if (this.isServerMod(message.member, message.channel)) return true;

		let allowedRoles = [
			'225209883828420608', // Accomplices
		];

		const roles = message.guild.roles.filter(r => allowedRoles.includes(r.id));
		if (roles && message.member.roles.find(r => roles.find(role => role.id === r))) return true;

		return false;
	}

	async execute({ message, args }) {
		let resolvedUser = await this.resolveUser(message.guild, args[0]);
		if (!resolvedUser) {
			try {
				resolvedUser = await this.dyno.restClient.getRESTUser(args[0]);
			} catch (err) {
				// pass
			}
		}

		if (resolvedUser) {
			try {
				const guilds = await this.models.Server.find({ premiumUserId: resolvedUser.id }, { _id: 1 });
				if (!guilds || !guilds.length) {
					return this.sendMessage(message.channel, `That user has no premium guilds.`);
				}
				await Promise.all(guilds.map(g => this.disableGuild(message, g._id)));
				return this.success(message.channel, `Disabled ${guilds.length} guilds for ${resolvedUser.username}#${resolvedUser.discriminator}`);
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, `Error: ${err.message}`);
			}
		} else {
			return this.disableGuild(message, args[0]);
		}
	}

	async disableGuild(message, guildId) {
		const logChannel = this.client.getChannel('231484392365752320');
		const dataChannel = this.client.getChannel('301131818483318784');

		if (!logChannel || !dataChannel) {
			return this.error(message.channel, 'Unable to find log channel.');
		}

		try {
			await this.dyno.guilds.update(guildId, { $unset: { vip: 1, isPremium: 1, premiumUserId: 1, premiumSince: 1 } });
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Error: ${err.message}`);
		}

		try {
			var doc = await this.models.Server.findOne({ _id: guildId }).lean().exec();
		} catch (e) {
			this.logger.error(e);
			return this.error(message.channel, `Error: ${e.message}`);
		}

		this.success(logChannel, `[**${this.utils.fullName(message.author)}**] Disabled Premium on **${doc.name} (${doc._id})**`);
		this.success(message.channel, `Disabled Dyno Premium on ${doc.name}`);
		
		message.delete().catch(() => false);
		
		const logDoc = {
			serverID: doc._id,
			serverName: doc.name,
			ownerID: doc.ownerID,
			userID: doc.premiumUserId || 'Unknown',
			timestamp: new Date().getTime(),
			type: 'disable',
		}
		
		await this.dyno.db.collection('premiumactivationlogs').insert(logDoc);
		return Promise.resolve();

		try {
			var messages = await this.client.getMessages(dataChannel.id, 500);
		} catch (err) {
			this.logger.error(e);
			return this.error(message.channel, `Error: ${err.message}`);
		}

		if (!messages || !messages.length) {
			return Promise.resolve();
		}

		for (let msg of messages) {
			let embed = msg.embeds[0];

			if (embed.fields.find(f => f.name === 'Server ID' && f.value === doc._id)) {
				embed.fields.push({ name: 'Disabled', value: moment().format('llll'), inline: true });
				// embed.fields.push({ name: 'Reason', value: reason, inline: true });
			}
			
			return msg.edit({ embed }).catch(err => this.logger.error(err));
		}
	}
}

module.exports = DisablePremium;

