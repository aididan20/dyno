'use strict';

const dot = require('dot-object');
const config = require('../core/config'); // eslint-disable-line

module.exports = function cfgset(dyno, config, message) {
	const key = message.d.key;
	let value = message.d.value;

	if (!key) {
		return process.send({ op: 'resp', d: 'No key specified.' });
	}

	if (!value) {
		return process.send({ op: 'resp', d: 'No value specified.' });
	}

	if (value === 'true' || value === 'false') {
		value = (value === 'true');
	}

	dot.set(key, value, config);

	return process.send({ op: 'resp', d: 'Success' });
};
