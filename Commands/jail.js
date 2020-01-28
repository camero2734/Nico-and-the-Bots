module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return;
        let mentions = msg.mentions.members.array();
        if (mentions.length < 1) return msg.channel.embed("You must @ at least one user!")
        let channelName = `${mentions.map(m => m.displayName.replace(/[^A-z0-9]/g, "")).join("-")}-chilltown`;

        let permissionOverwrites = [{
            deny: ["VIEW_CHANNEL"],
            id: msg.guild.id
        }, {
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
            id: "330877657132564480" // Staff
        }, {
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
            id: "275114879248236544" // Bots
        }, {
            deny: ["SEND_MESSAGES"],
            id: "278225702455738368" // Muted
        }];
        for (let member of mentions) {
            permissionOverwrites.push({ allow: ["VIEW_CHANNEL"], id: member.user.id });
            if (member.roles.get("283272728084086784")) {
                await member.removeRole("283272728084086784"); // Remove DE
                await member.addRole("656918036053491780"); // Add Jail DE
            }
            if (member.roles.get("386969744709910530")) {
                await member.removeRole("386969744709910530"); // Remove Gold
            }
            await member.addRole(TO); // Add muted
            await member.addRole("574731157061632000"); // Add hideallchannels
        }

        let options = {type: "text", permissionOverwrites}
        let c = await  msg.guild.createChannel(channelName, options);
        c.setParent("625524136785215498");
        await msg.channel.embed(`Created channel <#${c.id}>`);
        await c.send(`Hello, ${mentions.map(m => m.toString()).join(" ")}. You have been added to "jail", which means your conduct has fallen below what is expected of this server.\n\n**Please wait for a staff member.**\n\n__Note for staff:__\nAll users are muted by default. You must \`!unmute\` them.`)
    },
    info: {
        aliases: ["jail", "ball"],
        example: "!jail @user1 @user2",
        minarg: 0,
        description: "Creates a temporary channel to hold a discussion between one or more members",
        category: "Staff"
    }
};