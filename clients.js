'use strict';

var TChannel = require('tchannel');
var TChannelThrift = require('tchannel/as/thrift');
var DebugLogtron = require('debug-logtron');
var fs = require('fs');
var path = require('path');
var Ringpop = require('ringpop');

var thriftFile = fs.readFileSync(
    path.join(__dirname, 'thrift', 'service.thrift'), 'utf8'
);

module.exports = ApplicationClients;

function ApplicationClients(config, options) {
    if (!(this instanceof ApplicationClients)) {
        return new ApplicationClients(config, options);
    }

    var self = this;

    self.logger = options.logger || DebugLogtron('loggerservice');
    self.bootFile = config.get('server.bootFile');
    self.port = config.get('server.port');

    self.tchannel = TChannel({
        logger: self.logger
    });

    self.loggerChannel = self.tchannel.makeSubChannel({
        serviceName: 'logger'
    });
    self.ringpopChannel = self.tchannel.makeSubChannel({
        serviceName: 'ringpop'
    });
    self.tchannelThrift = TChannelThrift({
        source: thriftFile
    });

    self.ringpop = Ringpop({
        app: 'logger-service',
        logger: self.logger,
        channel: self.ringpopChannel,
        hostPort: '127.0.0.1:' + self.port
    });
}

ApplicationClients.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    self.tchannel.listen(self.port, '127.0.0.1', onListening);

    function onListening() {
        self.ringpop.setupChannel();

        if (self.bootFile) {
            self.ringpop.bootstrap(self.bootFile, cb);
        } else {
            cb(null);
        }
    }
};

ApplicationClients.prototype.destroy = function destroy() {
    var self = this;

    self.tchannel.close();
    self.ringpop.destroy();
};
