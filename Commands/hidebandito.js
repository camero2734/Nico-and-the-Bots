module.exports = {
    execute: function (msg) {
        const role = "501484411280424985";
        if (!msg.member.hasRole(role)) {
            msg.member.addRole(role);
            msg.channel.embed("<#487830419149029376> is now hidden from you. ¡No más SPOILERS!")
        } else {
            msg.member.removeRole(role);
            msg.channel.embed("<#487830419149029376> is no longer hidden from you. ¡Puedes verlo de nuevo!")
        }
    },
    info: {
        aliases: ["hidebandito","hidetour","banditotour"],
        example: "!hidebandito",
        minarg: 0,
        description: "Hides <#501478334132256769> so you don't get SPOILED!",
        category: "Other",
    }
}