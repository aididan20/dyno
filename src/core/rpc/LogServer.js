/* eslint-disable no-unused-vars */
const WebSocket = require('ws');
const jayson = require('jayson');

class LogServer {
    init(port) {
        this.wss = new WebSocket.Server({ port });
    }

    hook(proc) {
        proc.process.stdout.pipe(process.stdout);
        proc.process.stdout.on('data', (data) => {
            this._broadcastLog(data, proc, 'stdout');
        });

        proc.process.stderr.pipe(process.stderr);
        proc.process.stderr.on('data', (data) => {
            this._broadcastLog(data, proc, 'stderr');
        });
    }

    _broadcastLog(data, proc, stream) {
        const msg = data.toString();
        const payload = {
            pid: proc.pid,
            createdAt: proc.createdAt,
            cm: !!proc.manager,
            msg,
            stream,
        };

        if (proc.options && proc.options.id !== undefined) {
            payload.cid = proc.options.id;
        }

        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(payload));
            }
        });
    }
}

module.exports = LogServer;
