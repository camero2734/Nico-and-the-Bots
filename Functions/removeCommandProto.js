module.exports = function() {
    var array = this.content.split(' ');
    array.shift();
    var toReturn = array.join(' ');
    return toReturn;
}