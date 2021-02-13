'use strict';

const util = require('util');
const {Command} = require('@dyno.gg/dyno-core');

class LoadModule extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['loadmodule', 'loadmod'];
		this.group        = 'Admin';
		this.description  = 'Load a module.';
		this.usage        = 'loadmodule [module]';
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	execute({ message, args }) {
		if (!this.dyno) return false;

		return this.dyno.ipc.awaitResponse('reload', { type: 'modules', name: args[0] })
			.then(data => this.sendCode(message.channel, data.map(d => util.inspect(d)), 'js'))
			.catch(err => this.sendCode(message.channel, err, 'js'));
	}
}

module.exports = LoadModule;
