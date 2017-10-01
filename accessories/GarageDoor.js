module.exports = function(homebridge, abstractAccessory, api) {
    return require('./Gate.js')(homebridge, abstractAccessory, api);
}