/* eslint-disable no-unused-vars */
'use strict';

const os = require('os');
const util = require('util');
const moment = require('moment-timezone');
const {Command} = require('@dyno.gg/dyno-core');

class Eval extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'eval';
		this.aliases      = ['eval', 'e'];
		this.group        = 'Admin';
		this.description  = 'Evaluate js code from discord';
		this.usage        = 'eval [javascript]';
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	permissionsFn({ message }) {
		if (!message.author) return false;
		if (!this.dyno.globalConfig || !this.dyno.globalConfig.developers) return false;

		if (this.dyno.globalConfig.developers.includes(message.author.id)) {
			return true;
		}

		return false;
	}

	async execute({ message, args, guildConfig }) {
		let msgArray = [],
			msg = message,
			dyno = this.dyno,
			client = this.client,
			config = this.config,
			models = this.models,
			redis = this.redis,
			utils = this.utils,
			result;

		try {
			result = eval(args.join(' '));
		} catch (e) {
			result = e;
		}

		if (result && result.then) {
			try {
				result = await result;
			} catch (err) {
				result = err;
			}
		}

		if (!result) {
			return Promise.resolve();
		}

		msgArray = msgArray.concat(this.utils.splitMessage(result, 1990));

		for (let m of msgArray) {
			this.sendCode(message.channel, m.toString().replace(this.config.client.token, 'potato'), 'js');
		}

		return Promise.resolve();
	}
}

module.exports = Eval;
