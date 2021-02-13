'use strict';

const { exec } = require('child_process');
const {Command} = require('@dyno.gg/dyno-core');

class Git extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'git';
		this.aliases      = ['git'];
		this.group        = 'Admin';
		this.description  = 'Execute a git command';
		this.usage        = 'git [stuff]';
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.expectedArgs = 1;
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

		try {
			result = await this.exec(`git ${args.join(' ')}`);
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

module.exports = Git;
