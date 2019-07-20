module.exports = function(name) {
    const hotload = require("hotload");
    command = hotload("../Commands/" + name + ".js", function(){});
    let fnctn = command.execute.toString()
    eval("toRun = " + fnctn)
    toRun(this, this.args)
}