'use strict';

module.exports = function ping() {
	process.send({ op: 'resp', d: 'pong' });
};
