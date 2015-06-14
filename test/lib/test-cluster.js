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
    self.appCount = opts.appCount || 1;
    self.apps = [];
    self.appPorts = [];
    self.bootFile = null;

    self.kafkaServer = KafkaServer(onMessage);
    self.kafkaHost = 'localhost';
    self.kafkaPort = self.kafkaServer.port; // looooooool
    self.kafkaMessages = [];

    self.clients = [];

    function onMessage(message) {
        self.onKafkaMessage(message);
    }
}

TestCluster.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    for (var i = 0; i < self.appCount; i++) {
        self.appPorts[i] = 20000 + Math.floor(Math.random() * 10000);
    }

    self.bootFile = self.appPorts.map(function b(port) {
        return '127.0.0.1:' + port;
    });

    for (i = 0; i < self.appCount; i++) {
        self.apps[i] = Application({
            logger: self.logger,
            port: self.appPorts[i],
            bootFile: self.bootFile
        });
    }

    parallel(self.apps.map(function l(app) {
        return app.bootstrap.bind(app);
    }), onInit);

    function onInit(err) {
        if (err) {
            return cb(err);
        }

        for (i = 0; i < self.appCount; i++) {
            var hostPort = self.bootFile[i];

            self.clients[i] = TestClient(self, hostPort);
        }
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

function TestClient(cluster, hostPort) {
    if (!(this instanceof TestClient)) {
        return new TestClient(cluster, hostPort);
    }

    var self = this;

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
        peers: [hostPort]
    });

    self.token = null;
}

TestClient.prototype.init = function init(cb) {
    var self = this;

    var req = self.clientChannel.request({
        serviceName: 'logger'
    });
    self.tchannelThrift.send(req, 'Logger::init', null, {
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
