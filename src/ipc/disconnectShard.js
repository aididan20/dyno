'use strict';

module.exports = function disconnectShard(dyno, config, message) {
	const client = dyno.client,
		id = parseInt(message.d),
		shard = client.shards.get(id);

	if (!shard) return;

	shard.disconnect({ reconnect: false });
};
