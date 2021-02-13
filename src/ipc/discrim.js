'use strict';

module.exports = function discrim(dyno, config, message) {
	const users = dyno.client.users.filter(u => !u.bot && u.discriminator === `${message.d}`);
	if (!users) {
		return process.send({ op: 'resp', d: 0 });
	}

	return process.send({
		op: 'resp',
		d: users.map(u => {
			let user = {
				username: u.username,
				discriminator: u.discriminator,
				avatar: u.avatar,
			};
			return user;
		}),
	});
};
