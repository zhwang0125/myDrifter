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

var redisModel = {};

/**
 * 检查用户是否超过扔瓶次数限制
 * @param owner
 * @param fn
 */
redisModel.checkThrowTimes = function (owner, fn) {
    pool.acquire(function (err, client) {
        if (err) {
            return fn({code: 0, msg: err});
        }

        // 到 2 号数据库检查用户是否超过扔瓶次数限制
        pool.SELECT(2, function () {
            // 获取该用户扔瓶次数
            client.GET(owner, function (err, result) {
                if (err) {
                    return fn({code: 0, msg: err});
                }

                // 检查用户次数
                if (result >= 10) {
                    return fn({code: 0, msg: '今天扔瓶子的机会已经用完啦~'});
                }

                // 扔瓶子次数加 1
                client.INCR(owner, function () {
                    // 检查是否是当天第一次扔瓶子
                    // 若是，则设置记录该用户扔瓶次数键的生存期为 1 天
                    // 若不是，生存期保持不变
                    client.TTL(owner, function (err, ttl) {
                        if (ttl === -1) {
                            client.EXPIRE(owner, 86400, function () {
                                // 释放连接
                                pool.release(client);
                            });
                        }
                        else {
                            pool.release(client);
                        }

                        fn({code: 0, msg: ttl});
                    });
                });
            });
        });
    });
};

/**
 * 检查用户是否超过捡瓶次数
 * @param owner
 * @param fn
 */
redisModel.checkPickTimes = function (owner, fn) {
    pool.acquire(function (err, client) {
        if (err) {
            return fn({code: 0, msg: err});
        }

        // 到 3 号数据库检查用户是否超过捡瓶次数限制
        pool.SELECT(3, function () {
            // 获取该用户捡瓶次数
            client.GET(owner, function (err, result) {
                if (err) {
                    return fn({code: 0, msg: err});
                }

                // 检查用户次数
                if (result >= 10) {
                    return fn({code: 0, msg: '今天捡瓶子的机会已经用完啦~'});
                }

                // 捡瓶次数加 1
                client.INCR(owner, function () {
                    // 检查是否是当天第一次捡瓶子
                    // 若是，则设置记录该用户捡瓶次数键的生存期为 1 天
                    // 若不是，生存期保持不变
                    client.TTL(owner, function (err, ttl) {
                        if (ttl === -1) {
                            client.EXPIRE(owner, 86400, function () {
                                // 释放连接
                                pool.release(client);
                            });
                        }
                        else {
                            pool.release(client);
                        }

                        fn({code: 0, msg: ttl});
                    });
                });
            });
        });
    });
};

/**
 * 扔一个瓶子
 * @param bottle
 * @param fn
 */
redisModel.throwOneBottle = function (bottle, fn) {
    bottle.time = bottle.time || Date.now();

    var bottleId = uuid.v4();
    var type = {male: 0, female: 1};

    pool.acquire(function (err, client) {
        if (err) {
            return fn({code: 0, msg: err});
        }

        client.SELECT(type[bottle.type], function () {
            client.HMSET(bottleId, bottle, function (err, result) {
                if (err) {
                    return fn({code: 0, msg: "过会儿再试试吧！"});
                }

                // 设置漂流瓶生存期
                client.PEXPIRE(bottleId, 86400000 + bottle.time - Date.now(), function () {
                    // 释放连接
                    pool.release(client);
                });

                // 返回结果，成功时返回 OK
                callback({code: 1, msg: result});
            });
        });
    });
};

/**
 * 捡一个瓶子
 * @param info
 * @param fn
 */
redisModel.pickOneBottle = function (info, fn) {
    var type = {all: Math.round(Math.random()), male: 0, female: 1};
    info.type = info.type || 'all';

    pool.acquire(function (err, client) {
        if (err) {
            return fn({code: 0, msg: err});
        }

        client.SELECT(type[info.type], function () {
            // 随机返回一个漂流瓶 id
            client.RANDOMKEY(function (err, bottleId) {
                if (err) {
                    return fn({code: 0, msg: err});
                }

                if (!bottleId) {
                    return fn({code: 1, msg: "海星"});
                }

                client.HGETALL(bottleId, function (err, bottle) {
                    if (err) {
                        return fn({code: 0, msg: "漂流瓶破损了..."});
                    }

                    client.DEL(bottleId, function () {
                        // 释放连接
                        pool.release(client);
                    });

                    fn({code: 1, msg: bottle});
                });
            });
        });
    });
};

/**
 * 检查扔瓶子次数，扔一个瓶子
 * @param bottle
 * @param fn
 */
redisModel.throw = function (bottle, fn) {
    // 检查用户扔平次数
    this.checkPickTimes(bottle.owner, function (result) {
        if (result.code === 0) {
            return fn(result);
        }

        // 扔一个瓶子
        this.throwOneBottle(bottle, function (result) {
            fn(result);
        });
    });
};

/**
 * 检查捡瓶次数，并见一个瓶子
 * @param info
 * @param fn
 */
redisModel.pick = function (info, fn) {
    this.checkPickTimes(info.owner, function (result) {
        if (result.code === 0) {
            return fn(result);
        }

        // 20% 概率捡到海星
        if (Math.random() <= 0.2) {
            return fn({code: 1, msg: "海星"});
        }

        this.pickOneBottle(info, function (result) {
            fn(result);
        });
    });
};

module.exports = redisModel;