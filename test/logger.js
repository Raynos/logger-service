'use strict';

var setTimeout = require('timers').setTimeout;

var TestCluster = require('./lib/test-cluster.js');

TestCluster.test('setting up a logger', {
    appCount: 2
}, function t(cluster, assert) {
    cluster.clients[0].init(onInit);

    function onInit(err) {
        assert.ifError(err);

        cluster.clients[1].log({
            token: cluster.clients[0].token,
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

TestCluster.test('calling health', {
    appCount: 2
}, function t(cluster, assert) {
    cluster.clients[0].health(onHealth);

    function onHealth(err, resp) {
        assert.ifError(err);

        assert.ok(resp.ok);
        assert.equal(resp.body.message, 'ok');

        assert.end();
    }
});
