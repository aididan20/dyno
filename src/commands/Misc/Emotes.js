'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Emojis extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['emotes', 'emojis'];
		this.group = 'Misc';
		this.description = 'Gets a list of server emojis.';
		this.usage = 'emotes';
		this.cooldown = 10000;
		this.expectedArgs = 0;
	}

	execute({ message, args }) {
		let query;

		if (args && args.length > 0) {
			query = args.join(' ').toLowerCase();
		}

		let emojis = message.guild.emojis;

		if (!emojis.length) {
			return this.sendMessage(message.channel, `There are no emotes in this server.`);
		}

		if (query) {
			emojis = emojis.filter(e => e.name.toLowerCase().search(query) > -1);
		}

		if (query && (!emojis || !emojis.length)) {
			return this.sendMessage(message.channel, `I couldn't find any emotes.`);
		}

		// console.log(emojis.map(e => `<:${e.name}:${e.id}>`).join(' '));
		const emojiCount = emojis.filter(e => !e.animated).length;
		const animatedCount = emojis.filter(e => e.animated).length;

		const embed = {
			color: this.utils.getColor('blue'),
			title: `${emojiCount}${!query ? '/50' : ''} Emotes, ${animatedCount}${!query ? '/50' : ''} Animated`,
			description: emojis.map(e => e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`).join(' '),
		};

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Emojis;
