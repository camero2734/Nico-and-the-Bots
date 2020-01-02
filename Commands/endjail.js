module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return;
        
        let jailChan = msg.channel;
        if (!jailChan.name.endsWith("chilltown") || jailChan.parentID !== "625524136785215498") {
            return msg.channel.embed(`This is not a jail channel. You almost deleted ${jailChan}. Think about your actions, ${msg.author}.`);
        }
        else {
            msg.channel.embed("Would delete")
        }
    },
    info: {
        aliases: ["endjail", "unjail", "unball", "endball", "ballnomore"],
        example: "!endjail (in jail channel)",
        minarg: 0,
        description: "Creates a temporary channel to hold a discussion between one or more members",
        category: "Staff"
    }
};