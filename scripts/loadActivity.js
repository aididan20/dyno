const progress = require('cli-progress');
const db = require('../src/core/database.js');
const config = require('../src/core/config');
const redis = require('../src/core/redis');

const clientId = config.client.id;
const shardCount = 1152;

const multibar = new progress.MultiBar({
  format: '{name} |{bar}| {percentage}% | {duration_formatted} | {value}/{total}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  clearOnComplete: false,
  stopOnComplete: true,
  hideCursor: true,
});

let mongoBar;
let redisBar;

const buffer = [];

async function flushToRedis() {
  const batchSize = 1000;
  const batchCount = Math.ceil(buffer.length / batchSize);

  let barProgress = 0;
  redisBar = multibar.create(batchCount, barProgress, { name: 'Buffer -> Redis' });

  let itemsInPipeline = 0;
  let pipeline = redis.pipeline();

  for (let e of buffer) {
    const shardId = ~~((e._id / 4194304) % shardCount);
    pipeline.hset(`guild_activity:${clientId}:${shardCount}:${shardId}`, e._id, e.lastActive);

    itemsInPipeline++;

    if (itemsInPipeline >= batchSize) {
      await pipeline.exec();
      pipeline = redis.pipeline();
      itemsInPipeline = 0;
      barProgress++;
      redisBar.update(barProgress);
    }
  }
  if (itemsInPipeline > 0) {
    await pipeline.exec();
  }
  barProgress++;
  redisBar.update(barProgress);
  redisBar.stop();
}

async function fetchMongoDocs() {
  const coll = await db.collection('servers');
  const count = await coll.count({ deleted: false });

  let i = 0;
  mongoBar = multibar.create(count, i, { name: 'Mongo -> Buffer' });

  coll.find({ deleted: false }, { projection: { lastActive: 1 } }).forEach((doc) => {
    i++;

    if (!doc.lastActive) {
      return mongoBar.update(i);
    }

    buffer.push(doc);

    mongoBar.update(i);
  },
  (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    mongoBar.stop();
    flushToRedis();
  });
}

setTimeout(fetchMongoDocs, 5000);
// models.Server.countDocuments({ deleted: false }).then(count => {
//   let i = 0, p = 0;
//   mongoBar = multibar.create(count, i, { name: 'Mongo -> Buffer' });

//   models.Server.find({ deleted: false }, { lastActive: 1 })
//     .cursor()
//     .on('data', doc => {
//       i++;

//       if (!doc.lastActive) {
// 	      return mongoBar.update(i);
//       }

//       buffer.push(doc);

//       mongoBar.update(i);
//     })
//     .on('end', () => {
//       mongoBar.stop();
//       flushToRedis();
//     });
// });
