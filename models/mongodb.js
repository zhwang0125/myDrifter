var mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1/myDrifter', {server: {poolSize: 10}}, function (err) {
    if(err) {
        console.error('mongodb start fail');
        return process.exit(1);
    }

    console.log('mongodb start success');
});