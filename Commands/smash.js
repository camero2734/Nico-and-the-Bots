module.exports = {
    execute: async function (msg) {
        let smashRole = "667564769204502585";

        if (msg.member.roles.get(smashRole)) {
            await msg.member.removeRole(smashRole);
            await msg.channel.embed("Role removed!");
        } else {
            await msg.member.addRole(smashRole);
            await msg.channel.embed("Role added!");
        }
    },
    info: {
        aliases: ["smash", "smashrole"],
        example: "!smash",
        minarg: 0,
        description: "Gives a user the smash role",
        category: "NA"
    }
};
