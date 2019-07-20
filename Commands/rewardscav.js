module.exports = {
    execute: async function (msg) {
        let roles = ["514180424314912769", "514180020642643980", "510943663329771548", "510943783664484352"];
        let json = {};
        for (let role of roles) {
            let name = msg.guild.roles.get(role).name;
            json[name] = [];
            let mems = msg.guild.roles.get(role).members.array();
            for (let mem of mems) json[name].push(mem.user.id);
        }
        fs.writeFileSync("scavengerroles.json", JSON.stringify(json));
    },
    info: {
        aliases: false,
        example: "!rewardscav",
        minarg: 0,
        description: "T",
        category: "Staff",
    }
}