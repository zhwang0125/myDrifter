var redis = require('redis');
var uuid = require('node-uuid');
var poolModule = require('generic-pool');

var pool = poolModule.Pool({
    name: 'redisPool',
    create: function (callback) {
        var client = redis.createClient();

        client.on('error', function (err) {
            console.error('error at connect redis fail');
            process.exit(1);
        });

        callback(null, client);
    },
    destroy: function (client) {
        client.quit();
    },
    max: 100,
    min: 5,
    idleTimeoutMillis: 30000,
    log: false
});