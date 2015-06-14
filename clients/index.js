'use strict';

var TChannel = require('tchannel');
var TChannelThrift = require('tchannel/as/thrift');
var DebugLogtron = require('debug-logtron');
var fs = require('fs');
var path = require('path');

var thriftFile = fs.readFileSync(
    path.join(__dirname, '..', 'thrift', 'service.thrift'), 'utf8'
);

module.exports = ApplicationClients;

function ApplicationClients(options) {
    if (!(this instanceof ApplicationClients)) {
        return new ApplicationClients(options);
    }

    var self = this;

    self.logger = options.logger || DebugLogtron('loggerservice');
    self.tchannel = TChannel({
        logger: self.logger
    });

    self.loggerChannel = self.tchannel.makeSubChannel({
        serviceName: 'logger'
    });
    self.tchannelThrift = TChannelThrift({
        source: thriftFile
    });
}

ApplicationClients.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    self.tchannel.listen(0, '127.0.0.1', cb);
};

ApplicationClients.prototype.destroy = function destroy() {
    var self = this;

    self.tchannel.close();
};
