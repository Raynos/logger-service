'use strict';

var tapeCluster = require('tape-cluster');
var parallel = require('run-parallel');
var tape = require('tape');
var DebugLogtron = require('debug-logtron');
var TChannel = require('tchannel');
var KafkaServer = require(
    'logtron/node_modules/kafka-logger/test/lib/kafka-server.js'
);

var Application = require('../../index.js');

TestCluster.test = tapeCluster(tape, TestCluster);

module.exports = TestCluster;

function TestCluster(opts) {
    if (!(this instanceof TestCluster)) {
        return new TestCluster(opts);
    }

    var self = this;

    self.logger = DebugLogtron('loggerservice');
    self.appCount = 1;
    self.apps = [];

    self.kafkaServer = KafkaServer(onMessage);
    self.kafkaHost = 'localhost';
    self.kafkaPort = self.kafkaServer.port; // looooooool
    self.kafkaMessages = [];

    self.client = null;

    function onMessage(message) {
        self.onKafkaMessage(message);
    }
}

TestCluster.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    for (var i = 0; i < self.appCount; i++) {
        self.apps[i] = Application({
            logger: self.logger
        });
    }

    parallel(self.apps.map(function l(app) {
        return app.bootstrap.bind(app);
    }), onInit);

    function onInit(err) {
        if (err) {
            return cb(err);
        }

        self.client = TestClient(self);
        cb(null);
    }
};

TestCluster.prototype.onKafkaMessage = function onMessage(m) {
    var self = this;

    self.kafkaMessages.push(m);
};

TestCluster.prototype.close = function close(cb) {
    var self = this;

    for (var i = 0; i < self.appCount; i++) {
        self.apps[i].destroy();
    }

    self.kafkaServer.close();

    cb();
};

function TestClient(cluster) {
    if (!(this instanceof TestClient)) {
        return new TestClient(cluster);
    }

    var self = this;

    var peers = cluster.apps.map(function h(app) {
        return app.clients.tchannel.hostPort;
    });

    self.cluster = cluster;
    self.tchannel = TChannel({
        logger: cluster.logger,
        requestDefaults: {
            hasNoParent: true,
            headers: {
                cn: 'test-client'
            }
        }
    });
    self.tchannelThrift = self.cluster.apps[0].clients.tchannelThrift;
    self.clientChannel = self.tchannel.makeSubChannel({
        serviceName: 'logger',
        peers: peers
    });

    self.token = null;
}

TestClient.prototype.init = function init(cb) {
    var self = this;

    self.tchannelThrift.send(self.clientChannel.request({
        serviceName: 'logger'
    }), 'Logger::init', null, {
        kafkaHost: self.cluster.kafkaHost,
        kafkaPort: self.cluster.kafkaPort,
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

TestClient.prototype.log = function log(opts, cb) {
    var self = this;

    self.tchannelThrift.send(self.clientChannel.request({
        serviceName: 'logger'
    }), 'Logger::log', null, {
        token: self.token,
        message: opts.message,
        level: opts.level
    }, cb);
};
