'use strict';

const each = require('async-each');
const glob = require('glob-promise');
const minimatch = require('minimatch');
const jsonSchema = require('mongoose_schema-json');
const { Collection, utils } = require('@dyno.gg/dyno-core');
const { models } = require('../database');
const logger = require('../logger');

/**
 * @class ModuleCollection
 * @extends Collection
 */
class ModuleCollection extends Collection {
	/**
	 * A collection of modules
	 * @param {Object} config The Dyno configuration object
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor(config, dyno) {
		super();

		this.dyno = dyno;
		this._client = dyno.client;
		this._config = config;
		this._listenerCount = 0;

		this.moduleList = this._config.moduleList || [];

		this.loadModules();
	}

	unload() {
		for (let module of this.values()) {
			module._unload();
			this.delete(module.name);
		}
	}

	/**
	 * Load commands
	 */
	async loadModules() {
		try {
			var files = await glob('**/*.js', {
				cwd: this._config.paths.modules,
				root: this._config.paths.modules,
				absolute: true,
			});
			files = files.filter(f => !minimatch(f, '**/commands/*'));
		} catch (err) {
			logger.error(err);
		}

		let modules = [];

		each(files, (file, next) => {
			if (file.endsWith('.map')) return next();

			const module = require(file);

			if (module.hasModules) {
				modules = modules.concat(Object.values(module.modules));
				return next();
			}

			modules.push(require(file));
			return next();
		}, err => {
			if (err) {
				logger.error(err);
			}

			utils.asyncForEach(modules, (module, next) => {
				this.register(module);
				return;
			}, (e) => {
				if (e) {
					logger.error(e);
				}
				logger.info(`[ModuleCollection] Registered ${this.size} modules.`);
			});
		});
	}

	/**
	 * Register module
	 * @param {Function} Module the module class
	 */
	register(Module) {
		if (Object.getPrototypeOf(Module).name !== 'Module') {
			return logger.debug(`[ModuleCollection] Skipping unknown module`);
		}

		let module = new Module(this.dyno),
			activeModule = this.get(module.name),
			globalConfig = this.dyno.globalConfig;

		if (activeModule) {
			logger.debug(`[ModuleCollection] Unloading module ${module.name}`);
			activeModule._unload();
			this.delete(module.name);
		}

		logger.debug(`[ModuleCollection] Registering module ${module.name}`);

		if (module.commands) {
			const commands = Array.isArray(module.commands) ? module.commands : Object.values(module.commands);
			each(commands, command => this.dyno.commands.register(command));
		}

		if (module.moduleModels) {
			this.registerModels(module.moduleModels);
		}

		// ensure the module defines all required properties/methods
		module.ensureInterface();

		if (!activeModule) {
			const moduleCopy = module.toJSON();

			if (module.settings) {
				moduleCopy.settings = jsonSchema.schema2json(module.settings);

				models.Server.schema.add({
					[module.name.toLowerCase()]: module.settings,
				});
			}

			moduleCopy._state = this._config.state;

			models.Module.findOneAndUpdate({ name: module.name, _state: this._config.state }, moduleCopy, { upsert: true, overwrite: true })
				.catch(err => logger.error(err));
		}

		this.set(module.name, module);

		if (this.moduleList.length && !this.moduleList.includes(Module.name)) {
			return;
		}

		if (globalConfig && globalConfig.modules.hasOwnProperty(module.name) &&
			globalConfig.modules[module.name] === false) return;

		each(this.dyno.dispatcher.events, (event, next) => {
			if (!module[event]) return next();
			module.registerListener(event, module[event]);
			this._listenerCount++;
			next();
		}, err => {
			if (err) logger.error(err);
			this.get(module.name)._start(this._client);
		});
	}

	registerModels(moduleModels) {
		if(!moduleModels || !moduleModels.length || moduleModels.length === 0) {
			return;
		}

		each(moduleModels, (model, next) => {
			if(typeof model !== 'object' || !model.name || (!model.skeleton && !model.schema)) {
				next();
				return;
			}

			logger.debug(`[ModuleCollection] Registering model: ${model.name}`);

			const schema = new this.dyno.db.Schema(model.skeleton || model.schema, model.options);

			this.dyno.db.registerModel({ name: model.name, schema });
		});
	}

	/**
	 * Enable or disable a module
	 * @param   {String} id      Guild id
	 * @param   {String} name    Module name
	 * @param   {String|Boolean} enabled Enabled or disabled
	 * @returns {Promise}
	 */
	async toggle(id, name, enabled) {
		let guildConfig = await this.dyno.guilds.getOrFetch(id),
			guild       = this._client.guilds.get(id),
			module      = this.get(name),
			key         = `modules.${name}`;

		enabled = enabled === 'true';

		if (!guild || !guildConfig)
			return Promise.reject(`Couldn't get guild or config for module ${name}.`);

		guildConfig.modules[name] = enabled;

		if (enabled && module && module.enable) module.enable(guild);
		if (!enabled && module && module.disable) module.disable(guild);

		return this.dyno.guilds.update(guildConfig._id, { $set: { [key]: enabled } });
	}
}

module.exports = ModuleCollection;
