'use strict';

var uuid = require('uuid');
var logtron = require('logtron');
var RelayRequest = require('./lib/relay-request.js');

module.exports = Endpoints;

function Endpoints(app) {
    if (!(this instanceof Endpoints)) {
        return new Endpoints(app);
    }

    var self = this;

    var channel = app.clients.loggerChannel;
    var thrift = app.clients.tchannelThrift;

    channel.handler = RingpopHandler({
        realHandler: channel.handler,
        channel: app.clients.loggerChannel,
        ringpop: app.clients.ringpop
    });

    thrift.register(channel, 'Logger::health', app, self.health);
    thrift.register(channel, 'Logger::init', app, self.init);
    thrift.register(channel, 'Logger::log', app, self.log);
}

Endpoints.prototype.health =
function health(app, req, head, body, cb) {
    cb(null, {
        ok: true,
        body: {
            message: 'ok'
        }
    });
};

Endpoints.prototype.init =
function init(app, req, head, body, cb) {
    var logger = logtron({
        meta: {
            team: body.team,
            project: body.project
        },
        backends: logtron.defaultBackends({
            kafka: {
                leafHost: body.kafkaHost,
                leafPort: body.kafkaPort
            }
        })
    });
    var token = req.headers.shardKey;

    app.loggerInstances[token] = logger;

    cb(null, {
        ok: true,
        body: {
            token: token
        }
    });
};

Endpoints.prototype.log =
function log(app, req, head, body, cb) {
    var logger = app.loggerInstances[req.headers.shardKey];

    logger[body.level](body.message, {}, onLogged);

    function onLogged() {
        cb(null, {
            ok: true,
            body: null
        });
    }
};

function RingpopHandler(options) {
    if (!(this instanceof RingpopHandler)) {
        return new RingpopHandler(options);
    }

    var self = this;

    self.realHandler = options.realHandler;
    self.ringpop = options.ringpop;
    self.channel = options.channel;
}

// hack.
RingpopHandler.prototype.type = 'tchannel.endpoint-handler';

RingpopHandler.prototype.handleRequest =
function handleRequest(req, buildRes) {
    var self = this;

    var shardKey = req.headers.shardKey;
    if (!shardKey) {
        req.headers.shardKey = shardKey = uuid();
    }

    var dest = self.ringpop.lookup(shardKey);
    if (self.ringpop.whoami() === dest) {
        return self.realHandler.handleRequest(req, buildRes);
    }

    var outreq = new RelayRequest(self.channel, req, buildRes);
    outreq.createOutRequest(dest);
};

RingpopHandler.prototype.register =
function register(arg1, fn) {
    var self = this;

    self.realHandler.register(arg1, fn);
};
