'use strict';

const { exec } = require('child_process');
const {Command} = require('@dyno.gg/dyno-core');

class Exec extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'exec';
		this.aliases      = ['exec', 'ex'];
		this.group        = 'Admin';
		this.description  = 'Execute a shell command';
		this.usage        = 'exec [command]';
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
			result = await this.exec(args.join(' '));
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

module.exports = Exec;
