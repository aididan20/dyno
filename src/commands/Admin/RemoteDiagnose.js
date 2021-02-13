const axios = require('axios');
const { Command } = require('@dyno.gg/dyno-core');

class RemoteDiagnose extends Command {

	constructor(...args) {
		super(...args);

		this.aliases      = ['rd'];
		this.group        = 'Admin';
		this.description  = 'Remote diagnose a command or module.';
		this.permissions  = 'admin';
		this.overseerEnabled = true;
		this.hideFromHelp = true;
		this.expectedArgs = 0;
		this.cooldown = 5000;
	}

	permissionsFn({ message }) {
		if (!message.author) return false;
		if (message.guild.id !== this.config.dynoGuild) return false;
		if (!this.dyno.globalConfig || !this.dyno.globalConfig.contributors) return false;

		const contribs = this.dyno.globalConfig.contributors.map(c => c.id);

		if (!contribs || !contribs.length) return false;

		if (contribs.includes(message.author.id)) {
			return true;
		}

		return false;
	}

	async getStatus() {
		try {
			const response = await axios.get('https://dyno.gg/api/status');
			if (!response.data) {
				return Promise.reject('Unable to retrieve data at this time.');
			}
			return response.data;
		} catch (err) {
			return Promise.reject(err);
		}
	}

	async execute({ message, args }) {
		if (!args || !args.length) {
			return this.error(message.channel, `Missing guild id and name`);
		}

		let local = false,
			params = args,
			cluster,
			host;

		if (args[0].length <= 3) {
			local = true;
			params = args.slice(1);
		}

		const [guildId, ...rest] = params;
		const name = rest.join(' ');

		if (!local) {
			let shardCount = this.dyno.globalConfig.shardCount || this.dyno.clientOptions.shardCount;
			const shard = ~~((guildId / 4194304) % shardCount);
			const hostMap = {
				titan: `titan.dyno.lan`,
				atlas: `atlas.dyno.lan`,
				pandora: `pandora.dyno.lan`,
				hyperion: `hype.dyno.lan`,
				enceladus: `prom.dyno.lan`,
				janus: `janus.dyno.lan`,
				local: `localhost`,
			};

			let servers;

			try {
				servers = await this.getStatus();
			} catch (err) {
				return this.error(message.channel, err);
			}

			if (!servers) {
				return this.error(message.channel, 'Unable to get servers.');
			}

			const serverName = Object.keys(servers).find(serverName => {
				return servers[serverName].find(s => s.result && s.result.shards.includes(shard));
			});

			if (!serverName) {
				return this.error(`Unable to find shard.`);
			}

			const server = servers[serverName].find(s => s.result && s.result.shards.includes(shard));
			host = hostMap[serverName.toLowerCase()];
			cluster = server.id;
		} else {
			cluster = args[0].replace(/([A-Z])([\d]+)/, '$2');
			host = 'localhost';
		}

		const port = 30000 + parseInt(cluster, 10);
		const client = new this.dyno.RPCClient(this.dyno, host, port);

		client.request('diagnose', { token: this.config.rpcToken, id: guildId, name }, (err, response) => {
			if (err) {
				return this.error(message.channel, `Something went wrong.`);
			}

			return this.sendMessage(message.channel, response.result || response.error);
		});

		return Promise.resolve();
	}
}

module.exports = RemoteDiagnose;
