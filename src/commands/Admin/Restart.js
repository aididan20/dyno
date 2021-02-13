const { Command } = require('@dyno.gg/dyno-core');
const { Client } = require('../../core/rpc');

class Restart extends Command {
	constructor(...args) {
		super(...args);

		this.aliases         = ['restart'];
		this.group           = 'Admin';
		this.description     = 'Restart shards.';
		this.usage           = 'restart';
		this.permissions     = 'admin';
		this.overseerEnabled = true;
		this.expectedArgs    = 0;
		this.cooldown        = 30000;
	}

	async execute({ message, args }) {
		if (!this.isAdmin(message.member) && !this.isOverseer(message.member)) {
			return this.error(`You're not authorized to use this command.`);
		}

		const hostMap = {
			dev: 'localhost',
		};

		try {
			if (!isNaN(args[1])) {
				const clusterId = parseInt(args[1], 10);
				const cluster = await this.db.collection('clusters').findOne({ env: args[0], id: clusterId });

				if (!cluster) {
					return this.error(message.channel, `Unable to find cluster ${args[1]}`);
				}

				const host = cluster.host.hostname;
				const client = new Client(host, 5052);

				client.request('restart', { id: cluster.id, token: this.config.restartToken });
				return this.success(message.channel, `Restarting cluster ${cluster.id}.`);
			} else {
				const host = hostMap[args[0]] || `${args[0]}.dyno.lan`;
				switch (args[1]) {
					case 'manager': {
						const client = new Client(host, 5050);
						client.request('restartManager', {});
						return this.success(message.channel, `Restarting cluster manager on ${args[0]}.`);
					}
					case 'all': {
						const client = new Client(host, 5052);
						client.request('restart', { id: 'all', token: this.config.restartToken });
						return this.success(message.channel, `Restarting all clusters on ${args[0]}.`);
					}
				}
			}
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, err);
		}
	}
}

module.exports = Restart;
