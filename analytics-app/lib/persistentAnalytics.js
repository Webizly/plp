var async = require('async'),
    moment = require('moment'),
    _ = require('underscore'),
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

        function syncBrowser(callback) {
            trAnl.getBrowsers(function (err, browser) {
                if (!err) {

                    // Detect new browser type and add it to the schema
                    for (var bt in browser) {
                        if (Total.schema.path('browser.' + bt) == undefined) {
                            var newschema = { browser: {} };
                            newschema.browser[bt] = 'number';
                            Total.schema.add(newschema);
                        }
                    }

                    Total.update(
                        { site: trAnl.site },
                        { timestamp: moment().toDate(),
                          browser: browser },
                        { upsert: true },
                        callback
                    );

                } else {
                    if (callback !== undefined) {
                        callback(err, browser);
                    }
                }
            });
        }

        function syncPage(callback) {
            trAnl.getPages(function (err, pages) {
                if (!err) {

                    // Find records
                    Total.findOne({ site: trAnl.site }, function (err, total) {
                        for (page in pages) {
                            var pageobj = _.findWhere(total.pages, { page: page });
                            if (pageobj) { // existing page: update hits
                                var idx = total.pages.indexOf(pageobj);
                                pageobj.hits = pages[page];
                                total.pages.set(idx, pageobj);
                            } else { // new page
                                total.pages.push({ page: page, hits: pages[page] });
                            }
                        }
                        total.save(callback);
                    });

                } else {
                    if (callback !== undefined) {
                        callback(err, pages);
                    }
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

        function syncBrowserMinute(callback) {
            var lastMinute = moment().subtract(1, 'minutes'),
                now = moment();

            function updateMinute(time, callback) {
                trAnl.getBrowserMinute(time.format('YYYYMMDDHHmm'), function (err, browser) {
                    if (!err) {
                        // Detect new browser type and add it to the schema
                        for (var bt in browser) {
                            if (TotalMinute.schema.path('browser.' + bt) == undefined) {
                                var newschema = { browser: {} };
                                newschema.browser[bt] = 'number';
                                TotalMinute.schema.add(newschema);
                            }
                        }

                        TotalMinute.update(
                            { site: trAnl.site, time: time.format('YYYYMMDDHHmm') },
                            { timestamp: moment().toDate(),
                              year: time.year(),
                              month: time.month(),
                              date: time.date(),
                              hour: time.hour(),
                              minute: time.minute(),
                              browser: browser },
                            { upsert: true },
                            callback                        
                        );
                    } else {
                        console.log(err);
                        callback(err, browser);
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

        function syncPagesMinute(callback) {
            var lastMinute = moment().subtract(1, 'minutes'),
                now = moment();

            function updateMinute(time, callback) {
                trAnl.getPagesMinute(time.format('YYYYMMDDHHmm'), function (err, pages) {
                    if (!err) {
                        console.log(pages);
                        TotalMinute.findOne({ site: trAnl.site, time: time.format('YYYYMMDDHHmm') }, function (err, totalMinute) {
                            console.log(err, totalMinute); 
                            for (page in pages) {
                                var pageobj = _.findWhere(totalMinute.pages, { page: page });
                                if (pageobj) { // existing page: update hits
                                    var idx = totalMinute.pages.indexOf(pageobj);
                                    pageobj.hits = pages[page];
                                    totalMinute.pages.set(idx, pageobj);
                                } else { // new page
                                    totalMinute.pages.push({ page: page, hits: pages[page] });
                                }
                            }
                            totalMinute.save(callback);
                        });
                    } else {
                        console.log(err);
                        callback(err, pages);
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
            var tasks = [
                syncTotal,
                syncBrowser,
                syncPage,
                syncTotalMinute,
                syncBrowserMinute,
                syncPagesMinute,
            ];
            async.parallel(tasks, callback);
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
