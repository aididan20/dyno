'use strict';

const pidusage = require('pidusage');

module.exports = function stats(dyno) {
	const client = dyno.client;
	const data = {
		guilds: client.guilds.size,
		users: client.users.size,
		retryAfters: Object.keys(client.retryAfters).length,
		messages: 0, // client.Messages.length,
		voice: client.voiceConnections.size,
		mem: process.memoryUsage(),
		uptime: process.uptime(),
	};

	pidusage.stat(process.pid, (err, stat) => {
		if (err) data.cpu = 'Err';
		data.cpu = stat.cpu.toFixed(2);
		process.send({ op: 'resp', d: data });
	});
};
