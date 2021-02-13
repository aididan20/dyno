'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Ping extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['ping'];
		this.group        = 'Info';
		this.description  = 'Ping the bot';
		this.usage        = 'ping';
		this.hideFromHelp = true;
		this.noDisable    = true;
		this.cooldown     = 3000;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		let start = Date.now();

		return this.sendMessage(message.channel, 'Pong! ')
			.then(msg => {
				let diff = (Date.now() - start);
				return msg.edit(`Pong! \`${diff}ms\``);
			});
	}
}

module.exports = Ping;
