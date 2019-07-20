module.exports = function (string) {
    if (this.startsWith("!" + string)) {
        return true
    }
    return false
}