'use strict';

const { exec } = require('child_process');
const {Command} = require('@dyno.gg/dyno-core');

class Speedtest extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['speedtest', 'speed'];
		this.group        = 'Admin';
		this.description  = 'Get the result of a speed test.';
		this.usage        = 'speedtest';
		this.permissions  = 'admin';
		this.extraPermissions = [this.config.owner || this.config.admin];
		this.overseerEnabled = true;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		return this.sendMessage(message.channel, '```Running speed test...```').then(m => {
			exec('/usr/bin/speedtest --simple --share', (err, stdout) => {
				if (err) return m.edit('An error occurred.');
				return m.edit('```\n' + stdout + '\n```');
			});
		}).catch(err => {
			if (this.config.self) return this.logger.error(err);
			return this.error(message.channel, 'Unable to get speedtest.');
		});
	}
}

module.exports = Speedtest;
