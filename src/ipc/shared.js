'use strict';

module.exports = function shared(dyno, config, message) {
        const client = dyno.client;

        const user = message.d.user;
        if (!user) return process.send({ op: 'error', d: 'Must specify user' });

        const guilds = [...client.guilds.values()].filter(g => g.members.has(user));

        if (!guilds || !guilds.length) return process.send({ op: 'resp', d: 0 });

        process.send({ op: 'resp', d: guilds.length });
};
