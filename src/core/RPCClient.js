const jayson = require('jayson');

class RPCClient {
	constructor(dyno, host, port) {
		this.dyno = dyno;
		this.client = jayson.client.http({
			host,
			port,
		});

		return this.client;
	}
}

module.exports = RPCClient;
