'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class EnablePremium extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'enpremium';
		this.aliases      = ['enpremium'];
		this.group        = 'Admin';
		this.description  = 'Enable premium for a server.';
		this.usage        = 'enpremium [server id] [user]';
		this.overseerEnabled = true;
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.expectedArgs = 2;
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
		let user = this.resolveUser(message.guild, args.slice(1).join(' '));

		if (!user) {
			if (!isNaN(args[0])) {
				user = await this.restClient.getRESTUser(args[0]);
			}
			if (!user) {
				return this.error(message.channel, 'Unable to find that user.');
			}
		}

		const logChannel = this.client.getChannel('231484392365752320');
		const dataChannel = this.client.getChannel('301131818483318784');

		if (!logChannel || !dataChannel) {
			return this.error(message.channel, 'Unable to find log channel.');
		}

		return this.dyno.guilds.update(args[0], { $set: { vip: true, isPremium: true, premiumUserId: user.id, premiumSince: new Date().getTime() } })
			.then(async () => {
				try {
					var doc = await this.models.Server.findOne({ _id: args[0] }).lean().exec();
				} catch (e) {
					return this.logger.error(e);
				}

				this.success(logChannel, `[**${this.utils.fullName(message.author)}**] Enabled Premium on **${doc.name} (${doc._id})** for ${user.mention}`);
				this.success(message.channel, `Enabled Dyno Premium on ${doc.name} for ${this.utils.fullName(user)}.`);

				const embed = {
					fields: [
						{ name: 'Server ID', value: doc._id, inline: true },
						{ name: 'Server Name', value: doc.name, inline: true },
						{ name: 'Owner ID', value: doc.ownerID, inline: true },
						{ name: 'User ID', value: user.id, inline: true },
						{ name: 'Username', value: this.utils.fullName(user), inline: true },
						{ name: 'Mention', value: user.mention, inline: true },
						{ name: 'Member Count', value: `${doc.memberCount || 0}`, inline: true },
						{ name: 'Region', value: `${doc.region || 'Unknown'}`, inline: true },
					],
					timestamp: new Date(),
				};

				const logDoc = {
					serverID: doc._id,
					serverName: doc.name,
					ownerID: doc.ownerID,
					userID: user.id,
					username: this.utils.fullName(user),
					memberCount: doc.memberCount || 0,
					region: doc.region || 'Unknown',
					timestamp: new Date().getTime(),
					type: 'enable',
				}
				
				await this.dyno.db.collection('premiumactivationlogs').insert(logDoc);

				this.sendMessage(dataChannel, { embed })
				message.delete().catch(() => false);

			})
			.catch(err => {
				this.logger.error(err);
				return this.error(message.channel, `Error: ${err.message}`);
			});
	}
}

module.exports = EnablePremium;
