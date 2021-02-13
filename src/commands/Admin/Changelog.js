'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Changelog extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'changelog';
		this.aliases      = ['changelog'];
		this.group        = 'Admin';
		this.description  = 'Add an item to the changelog.';
		this.usage        = 'changelog [stuff]';
		this.overseerEnabled = true;
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	execute({ message, args }) {
		return this.models.Changelog.insert({ entry: args.join(' ') })
			.then(() => this.success(message.channel, `Entry added.`))
			.catch(err => this.error(message.channel, err));
	}
}

module.exports = Changelog;
