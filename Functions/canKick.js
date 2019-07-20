module.exports = function (msg) {
    if (!msg || !msg.member) return false
    if (msg.member.hasPermission('BAN_MEMBERS') || ((msg.member.roles.get('283272728084086784')) && (fairlycankick)) || (msg.member.roles.get('330877657132564480'))) return true
    return false
}