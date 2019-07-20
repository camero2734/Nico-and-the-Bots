module.exports = function (i, double) {
    if (double) {
        if (i < 10) return "00" + i;
        if (i < 100) return "0" + i
        return "" + i
    }
    return (i < 10) ? "0" + i : "" + i;
}