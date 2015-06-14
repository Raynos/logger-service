'use strict';

var tapeCluster = require('tape-cluster');
var parallel = require('run-parallel');
var tape = require('tape');
var DebugLogtron = require('debug-logtron');
var KafkaServer = require(
    'logtron/node_modules/kafka-logger/test/lib/kafka-server.js'
);

var TestClient = require('./test-client.js');
var Application = require('../../app.js');

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
            seedConfig: {
                server: {
                    port: self.appPorts[i],
                    bootFile: self.bootFile
                }
            }
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

            self.clients[i] = TestClient({
                hostPort: hostPort,
                logger: self.logger,
                kafkaHost: self.kafkaHost,
                kafkaPort: self.kafkaPort
            });
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

