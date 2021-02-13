'use strict';

const axios = require('axios');
const {Command} = require('@dyno.gg/dyno-core');

class ListingBlacklist extends Command {
	constructor(...args) {
		super(...args);

		this.aliases         = ['listingblacklist'];
		this.group           = 'Admin';
		this.description     = 'Blacklists and unlists a server from the server-listing.';
		this.usage           = 'listingblacklist guildid';
		this.permissions     = 'admin';
		this.overseerEnabled = true;
		this.expectedArgs    = 1;
		this.cooldown        = 1000;
	}

	async execute({ message, args }) {
		if (!this.isAdmin(message.member) && !this.isOverseer(message.member)) {
			return this.error(`You're not authorized to use this command.`);
		}

        const guildId = args[0];

        const coll = await this.db.collection('serverlist_store');
		const doc = await coll.findOne({ id: guildId });

		if (!doc) {
			return this.error(message.channel, 'No guild found.');
        }

        await coll.updateOne({ id: guildId }, { $set: { blacklisted: true, listed: false } });

        return this.success(message.channel, `Succesfully blacklisted & unlisted ${doc.name} - ${doc.id}`);
	}
}

module.exports = ListingBlacklist;
