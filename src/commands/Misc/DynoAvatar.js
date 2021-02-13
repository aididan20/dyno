'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class DynoAvatar extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['dynoavatar', 'dynoav'];
		this.group = 'Misc';
		this.description = 'Generates a Dyno-like avatar.';
		this.usage = 'dynoav';
		this.cooldown = 10000;
		this.expectedArgs = 0;
	}

	execute({ message, args }) {
		let user = args.length ? this.resolveUser(message.channel.guild, args[0]) : message.author;

        if (!user) {
            return this.error(message.channel, `Couldn't find that user.`);
        }

        user = user.user || user;

		let avatar = user.dynamicAvatarURL(null, 256);
		const dynoAvatar = `${this.config.colorapi.host}/dynoav?url=${avatar}?r=1.1`;
        // avatar = avatar.match(/.gif/) ? `${avatar}&f=.gif` : avatar;

        return this.sendMessage(message.channel, { embed: {
            author: {
                name: this.utils.fullName(user),
                icon_url: user.dynamicAvatarURL(null, 32).replace(/\?size=.*/, ''),
            },
            title: 'Avatar',
            image: { url: dynoAvatar, width: 256, height: 256 },
        } });
	}
}

module.exports = DynoAvatar;
