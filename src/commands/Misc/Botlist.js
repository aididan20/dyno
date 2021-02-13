'use strict';

const axios = require('axios');
const {Command} = require('@dyno.gg/dyno-core');

class Botlist extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['botlist'];
		this.group = 'Misc';
		this.description = 'Gets the carbonitex bot list ordered by server counts';
		this.usage = 'botlist [page]';
		this.hideFromHelp = true;
		this.cooldown = 5000;
		this.expectedArgs = 0;
	}

	async execute({ message, args }) {
		let page = args[0] || 1,
			i = 0;

		try {
			const res = await axios.get(this.config.carbon.list);
			var data = res.data;
		} catch (err) {
			return this.logger.error(err);
		}

		let list = [];
		if (this.dyno.botlist && (Date.now() - this.dyno.botlist.createdAt) < 300000) {
			list = this.dyno.botlist.data;
		} else {
			list = data.map(bot => {
				bot.botid = parseInt(bot.botid);
				bot.servercount = parseInt(bot.servercount);
				return bot;
			})
			.filter(bot => bot.botid > 1000)
			.sort((a, b) => (a.servercount < b.servercount) ? 1 : (a.servercount > b.servercount) ? -1 : 0)
			.map(bot => {
				let name = bot.name.includes('spoo.py') ? 'spoo.py' : bot.name;
				let field = {
					name: `${++i}. ${name}`,
					value: `${bot.servercount} Servers`,
					inline: true,
				};
				return field;
			});

			this.dyno.botlist = {
				createdAt: Date.now(),
				data: list,
			};
		}

		if (!list || !list.length) {
			return this.error(message.channel, `Unable to get results`);
		}

		let start = (page - 1) * 10;

		list = list.slice(start, start + 10);

		return this.sendMessage(message.channel, { embed: {
			color: parseInt(('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6), 16),
			description: `**Bot List (Page ${page}**)`,
			fields: list,
			footer: { text: 'Last Updated' },
			timestamp: new Date(this.dyno.botlist.createdAt),
		} });
	}
}

module.exports = Botlist;
