/* eslint-disable no-unused-vars */
const jayson = require('jayson');

class Server {
	init(host, port, methods) {
		this.host = host;
		this.port = port;
		this.server = jayson.server(methods);
		this.server.http().listen(this.port, this.host);
	}
}

module.exports = Server;
