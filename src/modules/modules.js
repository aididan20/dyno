'use strict';

const config = require('../core/config');
const logger = require('../core/logger');

const importedModules = {};
const loadedModules = {};

try { importedModules.Automod = require('@dyno.gg/automod').Automod; } catch (err) {}
try { importedModules.Autoroles = require('@dyno.gg/autoroles').Autoroles; } catch (err) {}
try { importedModules.CustomCommands = require('@dyno.gg/customcommands').CustomCommands; } catch (err) {}
try { importedModules.Manager = require('@dyno.gg/manager').Manager; } catch (err) {}
try { importedModules.Moderation = require('@dyno.gg/moderation').Moderation; } catch (err) {}
try { importedModules.Music = require('@dyno.gg/music').Music; } catch (err) {}
try { importedModules.Fun = require('@dyno.gg/fun').Fun; } catch (err) {}
try { var modules = require('@dyno.gg/modules'); } catch (err) {}

for (let [key, module] of Object.entries(importedModules)) {
	if (config.modules.includes(key)) {
		loadedModules[key] = module;
	}
}

if (modules) {
	for (let [key, module] of Object.entries(modules)) {
		if (config.modules.includes(key)) {
			loadedModules[key] = module;
		}
	}
}

module.exports = {
	hasModules: true,
	modules: loadedModules,
};
