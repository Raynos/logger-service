#!/usr/bin/env node
'use strict';

var Application = require('./app.js');

module.exports = main;

if (require.main === module) {
    main();
}

function main() {
    var app = Application();

    app.bootstrap(function onAppReady(err) {
        if (err) {
            throw err;
        }

        app.clients.logger.info('server started', {
            serverAddress: app.clients.tchannel.address()
        });
    });
}
