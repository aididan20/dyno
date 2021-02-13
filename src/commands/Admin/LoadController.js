'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class LoadController extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['loadc'];
		this.group        = 'Admin';
		this.description  = 'Load a controller.';
		this.usage        = 'loadc [controller]';
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	execute({ args }) {
		const module = this.modules.get('API');
		module.loadController(args[0]);
	}
}

module.exports = LoadController;
