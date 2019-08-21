module.exports = function (c) {
    let _ar = c.split(" ");
    _ar.shift();
    var r = _ar.join(" ");
    return r;
};