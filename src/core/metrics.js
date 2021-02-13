const express = require('express');
const cluster = require('cluster');
const prom = require('prom-client');
const config = require('./config');
const logger = require('./logger');
const server = express();
const Registry = prom.Registry;
const AggregatorRegistry = prom.AggregatorRegistry;

const aggregatorRegistry = new AggregatorRegistry();
const cmRegister = new Registry();

if (cluster.isMaster) {
	server.get('/metrics', (req, res) => {
		aggregatorRegistry.clusterMetrics((err, metrics) => {
			if (err) logger.error(err);
			res.set('Content-Type', aggregatorRegistry.contentType);
			res.send(metrics);
		});
    });

    server.get('/cm_metrics', (req, res) => {
        res.set('Content-Type', cmRegister.contentType);
        res.end(cmRegister.metrics());
    });

    cmRegister.setDefaultLabels({ server: config.stateName.toLowerCase() });
    prom.collectDefaultMetrics({ register: cmRegister, prefix: 'dyno_cm_' });
	server.listen(3001);
} else {
    const defaultLabels = { clusterId: process.env.clusterId, server: config.stateName.toLowerCase() };
    prom.register.setDefaultLabels(defaultLabels);
    prom.collectDefaultMetrics({ prefix: 'dyno_app_' });

    const messagesCounter = new prom.Counter({
        name: 'dyno_app_messages_sent',
        help: 'Counts messages sent (type = dm|normal|webhook)',
        labelNames: ['type'],
    });
    const helpSentCounter = new prom.Counter({
        name: 'dyno_app_help_sent',
        help: 'Counts helps sent',
    });
    const helpFailedCounter = new prom.Counter({
        name: 'dyno_app_help_failed',
        help: 'Counts helps failed',
    });
    const guildsCarbon = new prom.Gauge({
        name: 'dyno_app_guilds_carbon',
        help: 'Guild count for Dyno',
    });
    const guildEvents = new prom.Counter({
        name: 'dyno_app_guild_events',
        help: 'Guild events counter (type = create, delete, etc)',
        labelNames: ['type'],
    });
    const guildCounts = new prom.Gauge({
        name: 'dyno_app_guild_count',
        help: 'Guild count based on cluster id',
    });
    const userCounts = new prom.Gauge({
        name: 'dyno_app_user_count',
        help: 'User count based on cluster id',
    });
    const gatewayEvents = new prom.Gauge({
        name: 'dyno_app_gateway_events',
        help: 'GW Event counter (type = event type)',
        labelNames: ['type'],
    });
    const messageEvents = new prom.Counter({
        name: 'dyno_app_message_events',
        help: 'Message events counter (type = create, delete, etc)',
        labelNames: ['type'],
    });
    const discordShard = new prom.Counter({
        name: 'dyno_app_discord_shard',
        help: 'Discord shard status (type = connect, disconnect, resume, etc)',
        labelNames: ['type'],
    });
    const commandSuccess = new prom.Counter({
        name: 'dyno_app_command_success',
        help: 'Command success counter (group = cmd group, name = cmd name)',
        labelNames: ['group', 'name'],
    });
    const commandError = new prom.Counter({
        name: 'dyno_app_command_error',
        help: 'Command error counter (group = cmd group, name = cmd name)',
        labelNames: ['group', 'name'],
    });
    const commandTimings = new prom.Histogram({
        name: 'dyno_app_command_time',
        help: 'Command timing histogram (group = cmd group, name = cmd name)',
        labelNames: ['group', 'name'],
        buckets: [100, 200, 300, 500, 800, 1000, 5000],
    });
    const purgeSuccessCounter = new prom.Counter({
        name: 'dyno_app_purge_success',
        help: 'Counts successful purges',
    });
    const purgeFailedCounter = new prom.Counter({
        name: 'dyno_app_purge_failed',
        help: 'Counts failed purges',
    });
    const eventLoopBlockCounter = new prom.Counter({
        name: 'dyno_app_node_blocked',
        help: 'Counts node event loop blocks',
    });
    const musicPlaylists = new prom.Counter({
        name: 'dyno_app_music_playlists',
        help: 'Counts music playlists',
    });
    const musicAdds = new prom.Counter({
        name: 'dyno_app_music_adds',
        help: 'Counts music adds',
    });
    const voiceTotals = new prom.Gauge({
        name: 'dyno_app_voice_total',
        help: 'Voice totals gauge',
        labelNames: ['state'],
    });
    const voicePlaying = new prom.Gauge({
        name: 'dyno_app_voice_playing',
        help: 'Voice playing gauge',
        labelNames: ['state'],
    });

    // Music module metrics
    const musicModuleMetrics = [
        new prom.Counter({
            name: 'dyno_app_music_total_user_listen_time',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_total_playing_time',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_song_ends',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_partial_song_ends',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_unique_session_joins',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_disconnects',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_joins',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_leaves',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_plays',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_search',
            help: 'Music module metrics',
        }),
        new prom.Counter({
            name: 'dyno_app_music_skips',
            help: 'Music module metrics',
        }),
        new prom.Summary({
            name: 'dyno_app_music_user_session_summary',
            help: 'Music module metrics',
        }),
        new prom.Summary({
            name: 'dyno_app_music_session_summary',
            help: 'Music module metrics',
        }),
    ];
}
