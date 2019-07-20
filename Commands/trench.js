
module.exports = {
    execute: function (msg) {
        const role = "";
        if (!msg.member.hasRole(role)) {
            msg.member.addRole(role);
            msg.channel.embed("<#501478334132256769> is now hidden from you. ¡No más SPOILERS!")
        } else {
            msg.member.removeRole(role);
            msg.channel.embed("<#501478334132256769> is no longer hidden from you. ¡Puedes verlo de nuevo!")
        }
    },
    info: {disable: true}
}