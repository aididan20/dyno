'use strict';

const axios = require('axios');
const {Command} = require('@dyno.gg/dyno-core');

class SetAvatar extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['setavatar', 'setav'];
		this.group        = 'Admin';
		this.description  = 'Set the bot avatar';
		this.usage        = 'avatar [url]';
		this.permissions  = 'admin';
		this.extraPermissions = [this.config.owner || this.config.admin];
		this.expectedArgs = 1;
	}

	async execute({ message, args }) {
		try {
			var res = await axios.get(args[0], {
				header: { Accept: 'image/*' },
				responseType: 'arraybuffer',
			}).then(response => `data:${response.headers['content-type']};base64,${response.data.toString('base64')}`);
		} catch (err) {
			return this.error(message.channel, 'Failed to get a valid image.');
		}

		console.log(res);

		return this.client.editSelf({ avatar: res })
			.then(() => this.success(message.channel, 'Changed avatar.'))
			.catch(() => this.error(message.channel, 'Failed setting avatar.'));
	}
}

module.exports = SetAvatar;
