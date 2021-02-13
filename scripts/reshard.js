const { collection, connection, models } = require('../src/core/database');
const config = require('../src/core/config');

async function createClusters(options) {
	try {
		const { clientId, shardCount } = options;
		const globalConfig = await models.Dyno.findOne().lean();
		let { clusterCount, serverMap } = globalConfig;
		let firstShardId = 0;
		let lastShardId = shardCount - 1;

		clusterCount = options.clusterCount || clusterCount;

		const shardIds = [...Array(1 + lastShardId - firstShardId).keys()].map(v => firstShardId + v);
		let clusters = chunkArray(shardIds, clusterCount);
		let servers = chunkArray(clusters, serverMap[clientId].length);

		clusters = servers.flatMap((s, i) => {
			const server = serverMap[clientId][i];
			return s.map((c, i) => ({
				host: {
					name: server.name,
					hostname: server.host || `${server.name}.dyno.lan`,
					state: server.state,
				},
				clientId,
				clusterCount,
				shardCount,
				firstShardId: c[0],
				lastShardId: c[c.length-1],
				env: options.env || 'dev',
			}));
		}).map((c, i) => ({ id: i, ...c }));

		const coll = collection('clusters');
		const states = serverMap[clientId].map(s => s.state);

		await coll.deleteMany({ 'host.state': { $in: states } });
		await coll.insertMany(clusters);

		connection.close();
	} catch (err) {
		throw err;
	}
}

function chunkArray(arr, chunkCount) {
	const arrLength = arr.length;
	const tempArray = [];
	let chunk = [];

	const chunkSize = Math.floor(arr.length / chunkCount);
	let mod = arr.length % chunkCount;
	let tempChunkSize = chunkSize;

	for (let i = 0; i < arrLength; i += tempChunkSize) {
		tempChunkSize = chunkSize;
		if (mod > 0) {
			tempChunkSize = chunkSize + 1;
			mod--;
		}
		chunk = arr.slice(i, i + tempChunkSize);
		tempArray.push(chunk);
	}

	return tempArray;
}

createClusters({
	clientId: '174603832993513472',
	shardCount: 2,
	clusterCount: 2,
	env: 'dev',
});

createClusters({
	clientId: '161660517914509312',
	shardCount: 1152,
	env: 'prod',
});

createClusters({
	clientId: '168274214858653696',
	shardCount: 16,
	clusterCount: 16,
	env: 'premium',
});

createClusters({
	clientId: '347378090399236096',
	shardCount: 2,
	clusterCount: 2,
	env: 'alpha',
});

// createClusters({
// 	clientId: '161660517914509312',
// 	shardCount: 1440,
// });

// clusters.forEach(c => console.log(JSON.stringify(c)));
