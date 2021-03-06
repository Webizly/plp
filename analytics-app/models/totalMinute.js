var mongoose = require('mongoose');

var totalMinuteSchema = mongoose.Schema({
  site: String,
  timestamp: Date,
  time: String,
  jsdate: Date,
  year: Number,
  month: Number,
  day: Number,
  hour: Number,
  minute: Number,
  hits: Number,
  browser: { Firefox: Number, Chrome: Number },
  os: {
    Linux: Number
  },
  platform: {
    Linux: Number
  },
  userid: {
    anonymous: Number
  },
  ipAddresses: [{
    ip: String,
    hits: Number
  }],
  pages: [ { page: String, hits: Number } ]
});

// totalSchema.methods = {};
totalMinuteSchema.index({ site: 1, time: -1 }, { site: 1, jsdate: -1 });

mongoose.model('TotalMinute', totalMinuteSchema);
