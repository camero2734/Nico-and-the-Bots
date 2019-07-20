module.exports = {
    execute: async function (msg) {
        let embed = new Discord.RichEmbed().setDescription("Checking all DE...");
        let em = await msg.channel.send(embed);
        if (msg.author.id !== poot) return;
        let UNQUALFIIED = [];
        if (msg.author.id === poot) {
            let members = msg.guild.roles.get("283272728084086784").members.array();
            for (let m of members) {
                await em.edit(embed.setDescription("Checking " + m.displayName + "..."));
                await checkDE(m, checkReq);
                await new Promise(n => {setTimeout(() => {n()}, 1000)})
            }
        }// else if (msg.author.id === poot) {
        //     let members = msg.guild.roles.get("283272728084086784").members.array();
        //     for (let m of members) {
        //         let response = await checkReq(m, false);
        //         if (!response.qualified) {
        //             UNQUALFIIED.push([m.displayName, response.nums, response.type, response.met ? response.met.length : 0]);
        //         }
        //     }
        //     console.log(UNQUALFIIED, UNQUALFIIED.length);
        //}
        
    },
    info: {
        aliases: false,
        example: "!checkde",
        minarg: 0,
        description: "Pootus can doodus",
        category: "Staff",
    }
}