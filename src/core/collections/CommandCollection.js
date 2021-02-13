'use strict';

const each = require('async-each');
const glob = require('glob-promise');
const minimatch = require('minimatch');
const { EventCollection, utils } = require('@dyno.gg/dyno-core');
const { models } = require('../database');
const logger = require('../logger');

/**
 * @class CommandCollection
 * @extends EventCollection
 */
class CommandCollection extends EventCollection {
	/**
	 * A collection of commands
	 * @param {Object} config The Dyno configuration object
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor(config, dyno) {
		super();

		this.dyno = dyno;
		this._client = dyno.client;
		this._config = config;

		this.loadCommands();
	}

	/**
	 * Load commands
	 */
	async loadCommands() {
		try {
			var [files, moduleFiles] = await Promise.all([
				glob('**/*.js', {
					cwd: this._config.paths.commands,
					root: this._config.paths.commands,
					absolute: true,
				}),
				glob('**/*.js', {
					cwd: this._config.paths.modules,
					root: this._config.paths.modules,
					absolute: true,
				}),
			]);

			moduleFiles = moduleFiles.filter(minimatch.filter('**/commands/*.js'));
			files = files.concat(moduleFiles);
		} catch (err) {
			logger.error(err);
		}

		utils.asyncForEach(files, file => {
			if (!file.endsWith('.js')) return;
			let load = () => {
				var command = require(file);
				this.register(command);
			};
			load();
			// utils.time(load, file);
			return;
		});
	}

	/**
	 * Register command
	 * @param {Function} Command A Command class to register
	 */
	register(Command) {
		if (Object.getPrototypeOf(Command).name !== 'Command') {
			return logger.debug('[CommandCollection] Skipping unknown command');
		}

		// create the command
		let command = new Command(this.dyno);

		// ensure command defines all required properties/methods
		command.name = command.aliases[0];

		logger.debug(`[CommandCollection] Registering command ${command.name}`);

		models.Command.update({ name: command.name, _state: this._config.state }, command.toJSON(), { upsert: true })
			.catch(err => logger.error(err));

		if (command.aliases && command.aliases.length) {
			for (let alias of command.aliases) {
				this.set(alias, command);
			}
		}
	}

	/**
	 * Unregister command
	 * @param {String} name Name of the command to unregister
	 */
	unregister(name) {
		logger.info(`Unregistering command: ${name}`);

		const command = this.get(name);
		if (!command) return;

		if (!command.aliases && !command.aliases.length) return;
		for (let alias of command.aliases) {
			logger.info(`Removing alias ${alias}`);
			this.delete(alias);
		}
	}
}

module.exports = CommandCollection;
