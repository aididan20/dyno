var MatomoTracker = require('matomo-tracker');
var logger = require('./logger');

let matomoUsers, matomoGuilds, matomoMusicGuilds, matomoMusicUsers, actionLogBuffer, autoresponderBuffer, automodBuffer, commandBuffer, musicBuffer;

const regionToCountryCodeMap = {
    'brazil': 'br',
    'vip-us-west': 'us',
    'vip-us-east': 'us',
    'us-west': 'us',
    'us-central': 'us',
    'us-east': 'us',
    'us-south': 'us',
    'japan': 'jp',
    'singapore': 'sg',
    'hongkong': 'hk',
    'vip-amsterdam': 'nl',
    'amsterdam': 'nl',
    'southafrica': 'za',
    'london': 'gb',
    'sydney': 'au',
    'frankfurt': 'DE',
    'russia': 'ru',
    'eu-central': 'pl',
    'eu-west': 'pt',
};

function initMatomo(dyno) {
    matomoUsers = new MatomoTracker(4, 'http://10.12.0.69/piwik.php');
    matomoGuilds = new MatomoTracker(5, 'http://10.12.0.69/piwik.php');
    matomoMusicGuilds = new MatomoTracker(8, 'http://10.12.0.69/piwik.php');
    matomoMusicUsers = new MatomoTracker(9, 'http://10.12.0.69/piwik.php');

    actionLogBuffer = { guildBuffer: [] };
    autoresponderBuffer = {  guildBuffer: [] };
    automodBuffer = { guildBuffer: [] };
    musicBuffer = { guildBuffer: [], userBuffer: [] };
    commandBuffer = { guildBuffer: [], userBuffer: [] };

    setInterval(() => {
        if (dyno.globalConfig && dyno.globalConfig.enableMatomo && dyno.globalConfig.enableMatomo[dyno.config.stateName.toLowerCase()]) { return; }
        if (!dyno.isReady) { return; }

        try {
            const guildArr = [];
            guildArr.push(...actionLogBuffer.guildBuffer);
            actionLogBuffer.guildBuffer = [];

            guildArr.push(...autoresponderBuffer.guildBuffer);
            autoresponderBuffer.guildBuffer = [];

            guildArr.push(...automodBuffer.guildBuffer);
            automodBuffer.guildBuffer = [];

            guildArr.push(...commandBuffer.guildBuffer);
            commandBuffer.guildBuffer = [];

            const userArr = [];

            userArr.push(...commandBuffer.userBuffer);
            commandBuffer.userBuffer = [];

            let start = new Date().getTime();

            if (guildArr.length > 0) {
                matomoGuilds.trackBulk(guildArr, () => {
                    const end = new Date().getTime();
                    logger.debug(`Flushed Matomo guild buffer. Took ${Math.abs(start - end)}ms for ${guildArr.length} events`);
                });
            }

            start = new Date().getTime();

            if (userArr.length > 0) {
                matomoUsers.trackBulk(userArr, () => {
                    const end = new Date().getTime();
                    logger.debug(`Flushed Matomo user buffer. Took ${Math.abs(start - end)}ms for ${userArr.length} events`);
                });
            }

            const musicGuildArr = [];
            musicGuildArr.push(...musicBuffer.guildBuffer);
            musicBuffer.guildBuffer = [];

            
            const musicUserArr = [];
            musicUserArr.push(...musicBuffer.userBuffer);
            musicBuffer.userBuffer = [];

            start = new Date().getTime();

            if (musicGuildArr.length > 0) {
                matomoMusicGuilds.trackBulk(musicGuildArr, () => {
                    const end = new Date().getTime();
                    logger.debug(`Flushed Matomo music guild buffer. Took ${Math.abs(start - end)}ms for ${musicGuildArr.length} events`);
                });
            }

            start = new Date().getTime();

            if (musicUserArr.length > 0) {
                matomoMusicUsers.trackBulk(musicUserArr, () => {
                    const end = new Date().getTime();
                    logger.debug(`Flushed Matomo music user buffer. Took ${Math.abs(start - end)}ms for ${musicUserArr.length} events`);
                });
            }
        } catch (err) {
            logger.error(err);
        }
    }, 10000);

    setInterval(() => {
        if (!dyno.isReady) { return; }
        if (dyno.globalConfig && dyno.globalConfig.enableMatomo && dyno.globalConfig.enableMatomo[dyno.config.stateName.toLowerCase()]) { return; }

        dyno.players.forEach((p) => {
            if (!p.voiceChannel || !p.voiceChannel.voiceMembers || !p.playing) { return; }
            const guild = p.voiceChannel.guild;

            const country = regionToCountryCodeMap[guild.region] || 'aq';
            musicBuffer.guildBuffer.push({
                token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                url: `/modules/music/session`,
                action_name: 'Music',
                ua: 'Node.js',
                e_c: 'Music',
                e_a: 'Session',
                e_n: 'Refresh',
                uid: guild.id,
                country,
                _cvar: JSON.stringify({
                    1: ['Guild ID', guild.id],
                }),
            });

            p.voiceChannel.voiceMembers.forEach((m) => {
                musicBuffer.userBuffer.push({
                    token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                    url: `/modules/music/user/session`,
                    action_name: 'Music',
                    ua: 'Node.js',
                    e_c: 'Music',
                    e_a: 'Session',
                    e_n: 'Refresh',
                    uid: m.id,
                    country,
                    _cvar: JSON.stringify({
                        1: ['Guild ID', guild.id],
                        2: ['User ID', m.id],
                    }),
                });
            });
        });
    }, 14 * 1000 * 60);

    matomoUsers.on('error', (err) => {
        logger.error(err);
    });

    matomoGuilds.on('error', (err) => {
        logger.error(err);
    });

    matomoMusicGuilds.on('error', (err) => {
        logger.error(err);
    });

    matomoMusicUsers.on('error', (err) => {
        logger.error(err);
    });

    dyno.internalEvents.on('music', ({ type, guild, channel, user, search, trackInfo }) => {
        if (dyno.globalConfig && dyno.globalConfig.enableMatomo && dyno.globalConfig.enableMatomo[dyno.config.stateName.toLowerCase()]) { return; }
        let guildEvent;
        let userEvent;
        let player;

        const country = regionToCountryCodeMap[guild.region] || 'aq';
        switch (type) {
            case 'start':
                guildEvent = {
                    token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                    url: `/modules/music/session/start`,
                    action_name: 'Music',
                    ua: 'Node.js',
                    e_c: 'Music',
                    e_a: 'Session',
                    e_n: 'Start',
                    uid: guild.id,
                    country,
                    _cvar: JSON.stringify({
                        1: ['Guild ID', guild.id],
                        2: ['Server', dyno.config.stateName],
                    }),
                };

                player = dyno.players.get(guild.id);
                if (!player || !player.playing || !player.voiceChannel || !player.voiceChannel.voiceMembers) {
                    player.voiceChannel.voiceMembers.forEach((m) => {
                        musicBuffer.userBuffer.push({
                            token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                            url: `/modules/music/user/session/join`,
                            action_name: 'Music',
                            ua: 'Node.js',
                            e_c: 'Music',
                            e_a: 'Session',
                            e_n: 'Start',
                            uid: m.id,
                            country,
                            _cvar: JSON.stringify({
                                1: ['Guild ID', guild.id],
                                2: ['User ID', m.id],
                                3: ['Server', dyno.config.stateName],
                            }),
                        });
                    });
                }

                break;
            case 'end':
                guildEvent = {
                    token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                    url: `/modules/music/session/end`,
                    action_name: 'Music',
                    ua: 'Node.js',
                    e_c: 'Music',
                    e_a: 'Session',
                    e_n: 'End',
                    uid: guild.id,
                    country,
                    _cvar: JSON.stringify({
                        1: ['Guild ID', guild.id],
                        2: ['Server', dyno.config.stateName],
                    }),
                };

                player = dyno.players.get(guild.id);
                if (!player || !player.voiceChannel || !player.voiceChannel.voiceMembers) {
                    break;
                }

                player.voiceChannel.voiceMembers.forEach((m) => {
                    musicBuffer.userBuffer.push({
                        token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                        url: `/modules/music/user/session/leave`,
                        action_name: 'Music',
                        ua: 'Node.js',
                        e_c: 'Music',
                        e_a: 'Session',
                        e_n: 'End',
                        uid: m.id,
                        country,
                        _cvar: JSON.stringify({
                            1: ['Guild ID', guild.id],
                            2: ['User ID', m.id],
                            3: ['Server', dyno.config.stateName],
                        }),
                    });
                });
                break;
            case 'join':
                userEvent = {
                    token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                    url: `/modules/music/user/session/join`,
                    action_name: 'Music',
                    ua: 'Node.js',
                    e_c: 'Music',
                    e_a: 'Session',
                    e_n: 'Start',
                    uid: user.id,
                    country,
                    _cvar: JSON.stringify({
                        1: ['Guild ID', guild.id],
                        2: ['User ID', user.id],
                        3: ['Server', dyno.config.stateName],
                    }),
                };
                break;
            case 'leave':
                userEvent = {
                    token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                    url: `/modules/music/user/session/leave`,
                    action_name: 'Music',
                    ua: 'Node.js',
                    e_c: 'Music',
                    e_a: 'Session',
                    e_n: 'End',
                    uid: user.id,
                    country,
                    _cvar: JSON.stringify({
                        1: ['Guild ID', guild.id],
                        2: ['User ID', user.id],
                        3: ['Server', dyno.config.stateName],
                    }),
                };
                break;
            case 'changeSong':
                guildEvent = {
                    token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                    url: `/modules/music/session/changeSong`,
                    action_name: 'Music',
                    ua: 'Node.js',
                    e_c: 'Music',
                    e_a: 'Session',
                    e_n: 'ChangeSong',
                    uid: guild.id,
                    country,
                    _cvar: JSON.stringify({
                        1: ['Guild ID', guild.id],
                        2: ['Server', dyno.config.stateName],
                    }),
                };
                break;
            case 'playSong':
                guildEvent = {
                    token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                    url: `/modules/music/session/playSong`,
                    action_name: 'Music',
                    ua: 'Node.js',
                    e_c: 'Music',
                    e_a: 'Session',
                    e_n: 'PlaySong',
                    uid: guild.id,
                    country,
                    _cvar: JSON.stringify({
                        1: ['Guild ID', guild.id],
                        2: ['Server', dyno.config.stateName],
                    }),
                };
                break;
            case 'search':
                guildEvent = {
                    token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                    url: `/modules/music/session/search`,
                    ua: 'Node.js',
                    search: search,
                    search_count: 1,
                    uid: guild.id,
                    country,
                    _cvar: JSON.stringify({
                        1: ['Guild ID', guild.id],
                        2: ['Params', search],
                        3: ['Server', dyno.config.stateName],
                    }),
                };
                break;
            case 'skip':
                guildEvent = {
                    token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
                    url: `/modules/music/session/skip`,
                    action_name: 'Music',
                    ua: 'Node.js',
                    e_c: 'Music',
                    e_a: 'Session',
                    e_n: 'Skip',
                    uid: guild.id,
                    country,
                    _cvar: JSON.stringify({
                        1: ['Guild ID', guild.id],
                        2: ['Server', dyno.config.stateName],
                    }),
                };
                break;
        }

        if (guildEvent) {
            musicBuffer.guildBuffer.push(guildEvent);
        }

        if (userEvent) {
            musicBuffer.userBuffer.push(userEvent);
        }
    });

    dyno.internalEvents.on('actionlog', ({ type, guild }) => {
        if (dyno.globalConfig && dyno.globalConfig.enableMatomo && dyno.globalConfig.enableMatomo[dyno.config.stateName.toLowerCase()]) { return; }
        if (!matomoUsers || !matomoGuilds) {
            return;
        }

        if (type === 'commands') {
            return;
        }

        actionLogBuffer.guildBuffer.push({
            token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
            url: `/modules/actionlog/${type}`,
            action_name: 'ActionLog',
            ua: 'Node.js',
            e_c: 'AutomatedAction',
            e_a: 'ActionLog',
            e_n: type,
            uid: guild.id,
            _cvar: JSON.stringify({
                1: ['Guild ID', guild.id],
                2: ['Server', dyno.config.stateName],
            }),
        });
    });

    dyno.internalEvents.on('autoresponder', ({ type, guild }) => {
        if (dyno.globalConfig && dyno.globalConfig.enableMatomo && dyno.globalConfig.enableMatomo[dyno.config.stateName.toLowerCase()]) { return; }
        if (!matomoUsers || !matomoGuilds) {
            return;
        }

        autoresponderBuffer.guildBuffer.push({
            token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
            url: `/modules/autoresponder/${type}`,
            action_name: 'AutoResponder',
            ua: 'Node.js',
            e_c: 'AutomatedAction',
            e_a: 'AutoResponder',
            e_n: type,
            uid: guild.id,
            _cvar: JSON.stringify({
                1: ['Guild ID', guild.id],
                2: ['Server', dyno.config.stateName],
            }),
        });
    });

    dyno.internalEvents.on('automod', ({ type, guild }) => {
        if (dyno.globalConfig && dyno.globalConfig.enableMatomo && dyno.globalConfig.enableMatomo[dyno.config.stateName.toLowerCase()]) { return; }
        if (!matomoUsers || !matomoGuilds) {
            return;
        }

        automodBuffer.guildBuffer.push({
            token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
            url: `/modules/automod/${type}`,
            action_name: 'AutoMod',
            ua: 'Node.js',
            e_c: 'AutomatedAction',
            e_a: 'AutoMod',
            e_n: type,
            uid: guild.id,
            _cvar: JSON.stringify({
                1: ['Guild ID', guild.id],
                2: ['Server', dyno.config.stateName],
            }),
        });
    });

    dyno.commands.on('command', ({ command, message, guildConfig, args, time, isServerAdmin, isServerMod }) => {
        if (dyno.globalConfig && dyno.globalConfig.enableMatomo && dyno.globalConfig.enableMatomo[dyno.config.stateName.toLowerCase()]) { return; }
        if (!matomoUsers || !matomoGuilds) {
            return;
        }

        const user = message.author;
        const channel = message.channel;
        const guild = channel.guild;
        commandBuffer.userBuffer.push({
            token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
            url: `/commands/${command.name}/${user.id}`,
            action_name: 'CommandUsed',
            ua: 'Node.js',
            e_c: 'Command',
            e_a: command.module || command.group,
            e_n: command.name,
            gt_ms: time,
            uid: user.id,
            _cvar: JSON.stringify({
                1: ['Command Name', command.name],
                2: ['Arguments', args.join(' ')],
                3: ['Guild ID', guild.id],
                4: ['Server', dyno.config.stateName],
                5: ['User ID', user.id],
            }),
            dimension2: (isServerAdmin || isServerMod) ? 'true' : 'false',
        });

        commandBuffer.userBuffer.push({
            token_auth: dyno.globalConfig.matomoTokenAuth || 'ee9e3342c6a8f02ea0e1278060dd3db5',
            url: `/commands/${command.name}/${user.id}`,
            action_name: 'CommandUsed',
            ua: 'Node.js',
            e_c: 'Command',
            e_a: command.module || command.group,
            e_n: command.name,
            gt_ms: time,
            uid: guild.id,
            _cvar: JSON.stringify({
                1: ['Command Name', command.name],
                2: ['Arguments', args.join(' ')],
                3: ['Guild ID', guild.id],
                4: ['Server', dyno.config.stateName],
                5: ['User ID', user.id],
            }),
        });
    });
}

module.exports = {
    initMatomo,
};
