/* eslint-disable no-unused-vars */
'use strict';

const util = require('util');
const {Command} = require('@dyno.gg/dyno-core');

class CommandStats extends Command {

	constructor(...args) {
		super(...args);

		this.aliases      = ['commandstats', 'cs'];
		this.group        = 'Admin';
		this.description  = 'Get command stats for the past 7 days';
		this.usage        = 'commandstats [command]';
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.overseerEnabled = true;
		this.expectedArgs = 0;
	}

	async execute({ message, args }) {
		let results = await this.models.CommandLog.aggregate([
			{ $group : { _id: '$command', count: { $sum: 1 } } },
		]).exec();

		if (!results || !results.length) {
			return this.error(message.channel, 'No results found.');
		}

		const commands = this.dyno.commands.filter(c => c.permissions === 'admin');
		const len = Math.max(...results.map(r => r._id.length));

		results = results
			.filter(r => !commands.find(c => c.name === r._id || c.aliases.includes(r._id)))
			.sort((a, b) => (a.count < b.count) ? 1 : (a.count > b.count) ? -1 : 0)
			.map(r => { // eslint-disable-line
				return { name: r._id, count: r.count };
			});

		const embed = {
			fields: [],
			timestamp: new Date(),
		};

		const start = 25 * (args[0] ? parseInt(args[0]) - 1 : 0);

		const res = results.splice(start, 25);
		for (let cmd of res) {
			embed.fields.push({ name: cmd.name, value: cmd.count.toString(), inline: true });
		}

		this.sendMessage(message.channel, { embed });

		// const msgArray = this.utils.splitMessage(results, 1990);

		// for (let m of msgArray) {
		// 	this.sendCode(message.channel, m, 'js');
		// }

		return Promise.resolve();
	}
}

module.exports = CommandStats;
