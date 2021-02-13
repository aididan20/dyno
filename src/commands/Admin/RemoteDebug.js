const { Command } = require('@dyno.gg/dyno-core');

class RemoteDebug extends Command {

	constructor(...args) {
		super(...args);

		this.name         = 'rdebug';
		this.aliases      = ['rdebug', 're'];
		this.group        = 'Admin';
		this.description  = 'Remotely debug a cluster';
		this.usage        = 're [host] [cluster] [code]';
		this.hideFromHelp = true;
		this.permissions  = 'admin';
		this.expectedArgs = 1;
	}

	permissionsFn({ message }) {
		if (!message.author) return false;
		if (!this.dyno.globalConfig || !this.dyno.globalConfig.developers) return false;

		if (this.dyno.globalConfig.developers.includes(message.author.id)) {
			return true;
		}

		return false;
	}

	async execute({ message, args }) {
		if (!args || !args.length) {
			return this.error(message.channel, `Missing server/cluster`);
		}

		try {
			const [_env, _cluster, ...codeArr] = args;
			const clusterId = parseInt(_cluster, 10);
			const cluster = await this.db.collection('clusters').findOne({ env: _env, id: clusterId });

			if (!cluster) {
				return this.error(message.channel, `Unable to find cluster ${_cluster}`);
			}

			const host = cluster.host.hostname;
			const port = 30000 + clusterId;
			const client = new this.dyno.RPCClient(this.dyno, host, port);

			client.request('debug', { token: this.config.rpcToken, code: codeArr.join(' ') }, (err, response) => {
				if (err) {
					return this.error(message.channel, `Something went wrong.`);
				}

				let msgArray = [],
					result = response.result;

				msgArray = msgArray.concat(this.utils.splitMessage(result, 1990));

				for (let m of msgArray) {
					this.sendCode(message.channel, m.toString().replace(this.config.client.token, 'potato'), 'js');
				}

				return Promise.resolve();
			});
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, err);
		}
	}
}

module.exports = RemoteDebug;
