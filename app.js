var mongodb = require('./models/mongodb');
var redis = require('./models/redis');
var express = require('express');
var app = express();

app.use(express.bodyParser());

app.get('/', function (req, res) {
    res.json({
        msg: "success"
    });
});

app.listen(3000, function (err) {
    if(err) {
        return console.log('Start server fail');
    }

    console.log('Start server success port 3000');
});
