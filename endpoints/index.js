'use strict';

var uuid = require('uuid');
var logtron = require('logtron');

module.exports = Endpoints;

function Endpoints(app) {
    if (!(this instanceof Endpoints)) {
        return new Endpoints(app);
    }

    var self = this;

    self.app = app;
    var channel = self.app.clients.loggerChannel;
    var thrift = self.app.clients.tchannelThrift;

    thrift.register(channel, 'Logger::init', app, self.init);
    thrift.register(channel, 'Logger::log', app, self.log);
}

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
    var token = uuid();

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
    var logger = app.loggerInstances[body.token];

    logger[body.level](body.message, {}, onLogged);

    function onLogged() {
        cb(null, {
            ok: true,
            body: null
        });
    }
};
