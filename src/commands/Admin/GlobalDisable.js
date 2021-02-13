'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class GlobalDisable extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['disglobal'];
		this.group        = 'Admin';
		this.description  = 'Disable a module or command globally';
		this.usage        = 'disglobal [name]';
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	execute({ message, args }) {
		const name = args.join(' ');
		const module = this.dyno.modules.get(name);
		const command = this.dyno.commands.get(name);
		const globalConfig = this.dyno.globalConfig || {};
		const options = { new: true, upsert: true };

		if (!module && !command) {
			return this.sendMessage(message.channel, `Couldn't find module or command ${name}`);
		}

		if (module) {
			globalConfig.modules = globalConfig.modules || {};
			globalConfig.modules[name] = false;
			return this.models.Dyno.findOneAndUpdate({}, globalConfig, options).then(doc => {
				this.config.global = doc.toObject();
				this.success(message.channel, `Disabled module ${name}`);
			}).catch(err => this.logger.error(err));
		}

		if (command) {
			globalConfig.commands = globalConfig.commands || {};
			globalConfig.commands[name] = false;
			return this.models.Dyno.findOneAndUpdate({}, globalConfig, options).then(doc => {
				this.config.global = doc.toObject();
				this.success(message.channel, `Disabled command ${name}`);
			}).catch(err => this.logger.error(err));
		}

		return Promise.resulve();
	}
}

module.exports = GlobalDisable;
