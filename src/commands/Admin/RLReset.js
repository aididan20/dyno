const { Command } = require('@dyno.gg/dyno-core');

class RLReset extends Command {

	constructor(...args) {
		super(...args);

		this.aliases      = ['rlreset'];
		this.group        = 'Admin';
		this.description  = 'Get various stats and data.';
		this.permissions  = 'admin';
		this.overseerEnabled = true;
		this.hideFromHelp = true;
		this.expectedArgs = 0;
		this.cooldown = 120000;
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

	async execute({ message, args }) {
		if (!args || !args.length) {
			return this.error(message.channel, `Missing server and cluster`);
		}

		try {
			const [_env, _cluster, guildId] = args;
			const clusterId = parseInt(_cluster, 10);
			const cluster = await this.db.collection('clusters').findOne({ env: _env, id: clusterId });

			if (!cluster) {
				return this.error(message.channel, `Unable to find cluster ${_cluster} on ${_env}`);
			}

			const host = cluster.host.hostname;
			const port = 30000 + clusterId;
			const client = new this.dyno.RPCClient(this.dyno, host, port);

			client.request('rlreset', { token: this.config.rpcToken, id: guildId }, (err) => {
				if (err) {
					return this.error(message.channel, `Something went wrong.`);
				}

				return this.success(message.channel, 'Success!');
			});

			return Promise.resolve();
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Something went wrong.`);
		}
	}
}

module.exports = RLReset;
