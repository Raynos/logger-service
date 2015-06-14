'use strict';

var fetchConfig = require('zero-config');

var ApplicationClients = require('./clients.js');
var Endpoints = require('./endpoints.js');

module.exports = Application;

function Application(options) {
    if (!(this instanceof Application)) {
        return new Application(options);
    }

    var self = this;
    options = options || {};

    self.config = fetchConfig(__dirname, {
        dcValue: 'local',
        seed: options.seedConfig,
        loose: false
    });

    self.clients = ApplicationClients(self.config, {
        logger: options.logger
    });
    self.endpoints = Endpoints(self);

    self.loggerInstances = {};
}

Application.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    self.clients.bootstrap(cb);
};

Application.prototype.destroy = function destroy() {
    var self = this;

    var loggerKeys = Object.keys(self.loggerInstances);
    for (var i = 0; i < loggerKeys.length; i++) {
        var logger = self.loggerInstances[loggerKeys[i]];

        logger.destroy();
    }

    self.clients.destroy();
};
