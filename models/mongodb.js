var mongoose = require('mongoose');

// 连接数据库
mongoose.connect('mongodb://127.0.0.1/myDrifter', {server: {poolSize: 10}}, function (err) {
    if (err) {
        console.error('mongodb start fail');
        return process.exit(1);
    }

    console.log('mongodb start success');
});

// 模型
var bottleModel = mongoose.model('Bottle', new mongoose.Schema({
    bottle: Array,
    message: Array
}, {
    collection: 'bottles'
}));

/**
 * 将用户捡到漂流瓶改变格式保存
 * @param picker
 * @param bottle
 * @param fn
 */
exports.save = function (picker, bottle, fn) {
    var bottleEntity = {bottle: [], message: []};
    bottleEntity.bottle.push(picker);
    bottleEntity.message.push([
        bottle.owner,
        bottle.time,
        bottle.content
    ]);
    bottleEntity = new bottleModel(bottleEntity);

    bottleEntity.save(function (err) {
        fn(err);
    });
};

/**
 * 获取用户捡到的所有漂流瓶
 * @param user
 * @param fn
 */
exports.getAll = function (user, fn) {
    bottleModel.find({bottle: user}, function (err, bottles) {
        if (err) {
            return fn({code: 0, msg: '获取漂流瓶列表失败...'});
        }

        fn({code: 1, msg: bottles});
    });
};

/**
 * 通过id获取漂流瓶
 * @param id
 * @param fn
 */
exports.getOne = function (id, fn) {
    bottleModel.findById(id, function (err, bottle) {
        if (err) {
            return fn({code: 0, msg: '读取漂流瓶失败...'});
        }

        fn({code: 1, msg: bottle});
    });
};

/**
 * 回复特定ID的漂流瓶
 * @param id
 * @param reply
 * @param fn
 */
exports.reply = function (id, reply, fn) {
    bottleModel.findById(id, function (err, bottle) {
        if (err) {
            return fn({code: 0, msg: '回复漂流瓶失败...'});
        }

        var newBottle = {};
        newBottle.bottle = bottle.bottle;
        newBottle.message = bottle.message;

        // 如果捡瓶子的人第一次回复漂流瓶，则在 bottle 键添加漂流瓶主人信息
        // 如果已经回复过漂流瓶，则不再添加
        if (newBottle.bottle.length === 1) {
            newBottle.bottle.push(bottle.message[0][0]);
        }

        // 在 message 键添加一条回复信息
        newBottle.message.push([reply.user, reply.time, reply.content]);

        // 更新数据库中该漂流瓶信息
        bottleModel.findByIdAndUpdate(id, newBottle, function (err, bottle) {
            if (err) {
                return fn({code: 0, msg: "回复漂流瓶失败..."});
            }
            // 成功时返回更新后的漂流瓶信息
            fn({code: 1, msg: bottle});
        });
    });
};

/**
 * 删除漂流瓶
 * @param id
 * @param fn
 */
exports.delete = function (id, fn) {
    bottleModel.findByIdAndRemove(id, function (err) {
        if (err) {
            return fn({code: 0, msg: '删除漂流瓶失败...'});
        }

        fn({code: 1, msg: '删除成功'});
    });
};
