

module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return msg.channel.embed("Only pootus can doodus");
        let mems = msg.guild.roles.get("283272728084086784").members.array();
        let outputStr = "Qualified users:\n\n";
        if (msg.mentions && msg.mentions.members && msg.mentions.members.first()) {
            let res = await checkReq(msg.mentions.members.first(), true);
            msg.channel.embed(res === true ? "Passed" : "Failed")
            console.log(res, /RESPONSE/)
        } else {
            let i = 0;
            for (let mem of mems) {
                if (typeof await checkReq(mem) !== "string") {
                    if ((mem.roles.get("330877657132564480") || mem.roles.get("326558787169288203") || mem.roles.get("326558918107070465") || mem.roles.get("326558916219502595"))) {}
                    else outputStr+=(mem.displayName + "\n");
                    i++;
                }
            }
            msg.channel.embed(outputStr + "\n\n" + i + "/" + mems.length);
        }
        
    },
    info: {
        aliases: false,
        example: "!purgde",
        minarg: 1,
        description: "Super Secret",
        category: "N/A",
    }
}