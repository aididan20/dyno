const jayson = require('jayson/promise');

class Client {
	constructor(host, port) {
		this.client = jayson.client.http({
			host,
			port,
		});

		return this.client;
	}
}

module.exports = Client;
