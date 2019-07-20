module.exports = function(id) {
    if (!this.roles.get(id)) return false
    else return true
} 