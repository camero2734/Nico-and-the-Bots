module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== "poot") return msg.channel.embed("Only pootus can doodus")
        let role = await msg.guild.roles.get("465268535543988224")
        let members = role.members.array();
        
        for (let mem of members) {
            await mem.removeRole("465268535543988224");
            await delay(1000);
        }

        async function delay(ms) {
            await new Promise(next => {
                setTimeout(() => {next()}, ms)
            })
        }
    },
    info: {
        aliases: false,
        example: "!ahh",
        minarg: 0,
        description: "Does stuff",
        category: "Staff",
    }
}