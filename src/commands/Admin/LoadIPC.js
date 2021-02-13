'use strict';

const path = require('path');
const util = require('util');
const {Command} = require('@dyno.gg/dyno-core');

class LoadIPC extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['loadipc'];
		this.group        = 'Admin';
		this.description  = 'Load an ipc command.';
		this.usage        = 'loadipc [command]';
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	execute({ message, args }) {
		if (!this.dyno) return false;

		let filePath = path.join(this.config.paths.ipc, args[0]);
		filePath = filePath.endsWith('.js') ? filePath : filePath + '.js';

		if (!this.utils.existsSync(filePath)) {
			return this.error(message.channel, `File does not exist: ${filePath}`);
		}

		return this.dyno.ipc.awaitResponse('reload', { type: 'ipc', name: args[0] })
			.then(data => this.sendCode(message.channel, data.map(d => util.inspect(d)), 'js'))
			.catch(err => this.sendCode(message.channel, err, 'js'));
	}
}

module.exports = LoadIPC;
