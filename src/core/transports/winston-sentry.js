/* eslint-disable */
const util = require('util');
const Raven = require('raven');
const winston = require('winston');
const config = require('../config');

var Sentry = winston.transports.Sentry = function (options) {
  winston.Transport.call(this, { level: options.level });

  // Default options
  this.defaults = {
    dsn: '',
    logger: 'root',
    autoBreadcrumbs: true,
    captureUnhandledRejections: false,
    levelsMap: {
      silly: 'debug',
      verbose: 'debug',
      info: 'info',
      debug: 'debug',
      warn: 'warning',
      error: 'error',
    },
    tags: {},
    extra: {},
  };

  // For backward compatibility with deprecated `globalTags` option
  options.tags = options.tags || options.globalTags;

  this.options = Object.assign({}, this.defaults, options);

  Raven.config(this.options.dsn, this.options);

  // Handle errors
  Raven.on('error', function (error) {
    var message = 'Cannot talk to sentry.';
    if (error && error.reason) {
        message += ' Reason: ' + error.reason;
    }
    console.error(message); // eslint-disable-line
  });
};

//
// Inherit from `winston.Transport` so you can take advantage
// of the base functionality and `.handleExceptions()`.
//
util.inherits(Sentry, winston.Transport);

//
// Expose the name of this Transport on the prototype
Sentry.prototype.name = 'sentry';
//

Sentry.prototype.log = function (level, msg, meta, callback) {
  level = this.options.levelsMap[level];
  meta = meta || {};

  var extraData = Object.assign({}, meta),
      tags = extraData.tags;
  delete extraData.tags;

  if (extraData.guild && typeof extraData.guild !== 'string') {
    if (extraData.guild.shard) {
      extraData.shard = extraData.guild.shard.id;
    }
    extraData.guild = extraData.guild.id;
  }

  if (config.clusterId || config.shardId) {
    extraData.clusterId = config.clusterId || config.shardId;
    extraData.clusterId = extraData.clusterId.toString();
  }
  extraData.pid = process.pid;

  if (config.firstShardId) extraData.firstShardId = config.firstShardId.toString();
  if (config.lastShardId) extraData.lastShardId = config.lastShardId.toString();

  var extra = {
    level: level,
    extra: extraData,
    tags: tags,
  };

  if (extraData.request) {
    extra.request = extraData.request;
    delete extraData.request;
  }

  if (extraData.user) {
    extra.user = extraData.user;
    delete extraData.user;
  }

  try {
    if (level === 'error') {
      // Support exceptions logging
      if (meta instanceof Error) {
        if (msg === '') {
          msg = meta;
        } else {
          meta.message = msg + '. cause: ' + meta.message;
          msg = meta;
        }
      }

      Raven.captureException(msg, extra, function () {
        callback(null, true);
      });
    } else {
      Raven.captureMessage(msg, extra, function () {
        callback(null, true);
      });
    }
  } catch (err) {
    console.error(err); // eslint-disable-line
  }
};

module.exports = Sentry;
