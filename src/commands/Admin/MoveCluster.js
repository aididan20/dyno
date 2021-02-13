const { Command } = require('@dyno.gg/dyno-core');
const { Client } = require('../../core/rpc');

class MoveCluster extends Command {
	constructor(...args) {
		super(...args);

		this.aliases         = ['clmove'];
		this.group           = 'Admin';
		this.description     = 'Move a cluster from one server to another.';
		this.usage           = 'clmove';
		this.permissions     = 'admin';
		this.expectedArgs    = 3;
		this.cooldown        = 30000;
	}

	async execute({ message, args }) {
		if (!this.isAdmin(message.member)) {
			return this.error(`You're not authorized to use this command.`);
		}

		try {
			if (!isNaN(args[1])) {
				const clusterId = parseInt(args[1], 10);
				const cluster = await this.db.collection('clusters').findOne({ env: args[0], id: clusterId });

				if (!cluster) {
					return this.error(message.channel, `Unable to find cluster ${args[1]}`);
				}

				const host = cluster.host.hostname;
				const client = new Client(host, 5052);

				let response = await client.request('moveCluster', { id: cluster.id, name: args[2], token: this.config.restartToken });

				return this.success(message.channel, `Moving cluster ${cluster.id} to ${args[2]}`);
			} else {
				return this.error(message.channel, 'Inavlid cluster id.');
			}
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, err);
		}
	}
}

module.exports = MoveCluster;
