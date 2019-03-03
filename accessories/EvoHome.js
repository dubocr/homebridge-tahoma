module.exports = function(homebridge, abstractAccessory, api) {
    return require('./HeatingSystem.js')(homebridge, abstractAccessory, api);
}