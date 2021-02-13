'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Avatar extends Command {
    constructor(...args) {
        super(...args);

        this.aliases      = ['avatar', 'av'];
        this.group        = 'Misc';
        this.description  = `Get a users' avatar.`;
        this.usage        = 'avatar [user]';
        this.expectedArgs = 0;
        this.cooldown     = 3000;
    }

    execute({ message, args }) {
        let user = args.length ? this.resolveUser(message.channel.guild, args[0]) : message.author;

        if (!user) {
            return this.error(message.channel, `Couldn't find that user.`);
        }

        user = user.user || user;

        let avatar = user.dynamicAvatarURL(null, 256);
        avatar = avatar.match(/.gif/) ? `${avatar}&f=.gif` : avatar;

        return this.sendMessage(message.channel, { embed: {
            author: {
                name: this.utils.fullName(user),
                icon_url: user.dynamicAvatarURL(null, 32).replace(/\?size=.*/, ''),
            },
            title: 'Avatar',
            image: { url: avatar, width: 256, height: 256 },
        } });
    }
}

module.exports = Avatar;
