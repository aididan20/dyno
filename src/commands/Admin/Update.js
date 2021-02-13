'use strict';

const { exec } = require('child_process');
const {Command} = require('@dyno.gg/dyno-core');

class Update extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'update';
		this.aliases      = ['update'];
		this.group        = 'Admin';
		this.description  = 'Update the bot';
		this.usage        = 'update (branch)';
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.expectedArgs = 0;
	}

	exec(command) {
		return new Promise((resolve, reject) => {
			exec(command, (err, stdout, stderr) => {
				if (err) return reject(err);
				return resolve(stdout || stderr);
			});
		});
	}

	async execute({ message, args }) {
		let msgArray = [],
			result;

		const branch = args && args.length ? args[0] : 'develop';
		this.sendMessage(message.channel, `Pulling the latest from ${branch}...`);

		try {
			result = await this.exec(`git pull origin ${branch}; gulp build`);
		} catch (err) {
			result = err;
		}

		msgArray = msgArray.concat(this.utils.splitMessage(result, 1990));

		for (let m of msgArray) {
			this.sendCode(message.channel, m, 'js');
		}

		return Promise.resolve();
	}
}

module.exports = Update;
