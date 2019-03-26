module.exports = function(homebridge, abstractAccessory, api) {
    return require('./OnOff.js')(homebridge, abstractAccessory, api);
}