'use strict';

var TChannel = require('tchannel');
var TChannelThrift = require('tchannel/as/thrift');
var fs = require('fs');
var path = require('path');

var thriftFile = fs.readFileSync(path.join(
    __dirname, '..', '..', 'thrift', 'service.thrift'
), 'utf8');

module.exports = TestClient;

function TestClient(options) {
    if (!(this instanceof TestClient)) {
        return new TestClient(options);
    }

    var self = this;

    self.tchannel = TChannel({
        logger: options.logger,
        requestDefaults: {
            hasNoParent: true,
            headers: {
                cn: 'test-client'
            }
        }
    });
    self.tchannelThrift = TChannelThrift({
        source: thriftFile
    });
    self.clientChannel = self.tchannel.makeSubChannel({
        serviceName: 'logger',
        peers: [options.hostPort]
    });

    self.kafkaHost = options.kafkaHost;
    self.kafkaPort = options.kafkaPort;

    self.token = null;
}

TestClient.prototype.init = function init(cb) {
    var self = this;

    var req = self.clientChannel.request({
        serviceName: 'logger'
    });
    self.tchannelThrift.send(req, 'Logger::init', null, {
        kafkaHost: self.kafkaHost,
        kafkaPort: self.kafkaPort,
        team: 'rt',
        project: 'logger'
    }, onResponse);

    function onResponse(err, resp) {
        if (err || !resp.ok) {
            return cb(err || resp.body);
        }

        self.token = resp.body.token;

        cb(null);
    }
};

TestClient.prototype.health = function health(cb) {
    var self = this;

    self.tchannelThrift.send(self.clientChannel.request({
        serviceName: 'logger'
    }), 'Logger::health', null, null, cb);
};

TestClient.prototype.log = function log(opts, cb) {
    var self = this;

    var req = self.clientChannel.request({
        serviceName: 'logger',
        host: opts.host,
        headers: {
            shardKey: opts.token
        }
    });
    self.tchannelThrift.send(req, 'Logger::log', null, {
        message: opts.message,
        level: opts.level
    }, cb);
};
