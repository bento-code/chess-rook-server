const EventEmitter = require('events');

console.log("events");

// create EventEmitter object
var events = new EventEmitter();

// export the EventEmitter object so others can use it
module.exports = events;
