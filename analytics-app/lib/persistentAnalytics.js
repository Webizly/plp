var async = require('async'),
    moment = require('moment'),
    mongoose = require('mongoose'),
    Total = mongoose.model('Total'),
    TotalMinute = mongoose.model('TotalMinute');

var persistentAnalyticsSingleton = (function () {

    var instance;

    function init() {

        var trAnl = require('./transientAnalytics');
        var intervalId;

        function syncTotal(callback) {
            trAnl.getTotal(function (err, data) {
                if (!err) {
                Total.update( { site: trAnl.site }, 
                              { timestamp: moment().toDate(),
                                hits: data },
                              { upsert: true },
                              callback );
                } else {
                    callback(err, data);
                }
            });
        }

        function syncTotalMinute(callback) {
            var lastMinute = moment().subtract(1, 'minutes'),
                now = moment();

            function updateMinute(time, callback) {
                trAnl.getTotalMinute(time.format('YYYYMMDDHHmm'), function (err, data) {
                    if (!err) {
                        TotalMinute.update(
                            { site: trAnl.site, time: time.format('YYYYMMDDHHmm') },
                            { timestamp: moment().toDate(),
                              year: time.year(),
                              month: time.month(),
                              date: time.date(),
                              hour: time.hour(),
                              minute: time.minute(),
                              hits: data },
                            { upsert: true },
                            callback                        
                        );
                    } else {
                        console.log(err);
                        callback(err, data);
                    }
                });
            }

            updateMinute(now, function (err, data) {
                // make sure last minute data is complete
                if (now.second() <= 10) {
                    updateMinute(lastMinute, function (err2, data2) {
                        callback(err, data);
                    });
                } else {
                    callback(err, data);
                }
            });
        }

        function store(callback) {
            var tasks = [syncTotal,
                        syncTotalMinute];
            async.parallel(tasks, function (err, data) {
                console.log(data);
            });
        }

        return {
            startTimer: function (syncTime) {
                intervalId = setInterval(store, syncTime);
            }
        };
    };

    return {
        getInstance: function () {
            if (!instance) {
                instance = init();
            }

            return instance;
        }
    };
})();

module.exports = persistentAnalyticsSingleton.getInstance();
