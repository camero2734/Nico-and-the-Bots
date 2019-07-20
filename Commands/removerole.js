module.exports = {
    execute: async function (msg) {
        console.log("yee");
        let role = await msg.guild.roles.get("465268535543988224")
        let members = role.members.array();
        
        console.log(members.length, /MEMS/)
        for (let mem of members) {
            console.log(mem.displayName)
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
        example: "a",
        minarg: 0,
        description: "a",
        category: "NA",
    }
}