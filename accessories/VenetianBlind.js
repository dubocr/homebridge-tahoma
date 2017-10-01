module.exports = function(homebridge, abstractAccessory, api) {
    return require('./Awning.js')(homebridge, abstractAccessory, api);
}