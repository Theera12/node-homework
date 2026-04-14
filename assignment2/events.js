const EventEmitter = require("events");
const emitter = new EventEmitter();

emitter.on("time", (timeString) => {
  console.log("Time received: " + timeString);
});

setInterval(() => {
  const currentTime = new Date().toString();
  emitter.emit("time", currentTime);
}, 5000);

module.exports = emitter;
