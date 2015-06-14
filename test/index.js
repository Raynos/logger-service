'use strict';

var setTimeout = require('timers').setTimeout;

var TestCluster = require('./lib/test-cluster.js');

TestCluster.test('setting up a logger', {
    appCount: 1
}, function t(cluster, assert) {
    cluster.client.init(onInit);

    function onInit(err) {
        assert.ifError(err);

        cluster.client.log({
            level: 'info',
            message: 'hi'
        }, onLogged);
    }

    function onLogged(err) {
        assert.ifError(err);

        setTimeout(checkKafka, 100);
    }

    function checkKafka() {
        assert.equal(cluster.kafkaMessages.length, 1);

        var msg = cluster.kafkaMessages[0];
        assert.equal(msg.topic, 'rt-logger');
        assert.equal(msg.messages.length, 1);
        var payload = msg.messages[0].payload;

        assert.equal(payload.level, 'info');
        assert.equal(payload.msg, 'hi');

        assert.end();
    }
});
