module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return msg.channel.embed("Only pootus can doodus");
        console.log("help")
        let concerts = "Monterrey-MX, Mexico City-MX, Guadalajara-MX, Vancouver-BC, Calgary-AB, Edmonton-AB, Winnipeg-MB, London-ON, Ottawa-ON, Montreal-QC, Toronto-ON, Grand Rapids-MI, Buffalo-NY, Brooklyn-NY, Newark-NJ, Pittsburgh-PA, Atlantic City-NJ, Charlottesville-VA, Raleigh-NC, Charlotte-NC, Jacksonville-FL, Miami-FL, Orlando-FL, Birmingham-AL, New Orleans-LA, Houston-TX, San Antonio-TX, Austin-TX, Oklahoma City-OK, Memphis-TN, Indianapolis-IN, Columbus-OH".split(", ");
        let category = msg.guild.channels.get("516361944421236740");
        console.log(category.children.array().length)
        // for (let concert of concerts) {
        //     console.log(chalk.green("Creating " + concert + "..."));
        //     try {
        //         let role = await msg.guild.createRole({name: concert.replace(/-/g, " ")});
        //         let chan = await msg.guild.createChannel(concert, 'text', [
        //           {
        //             id: msg.client.user.id,
        //             allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        //         },{
        //             id: msg.guild.id,
        //             deny: ['VIEW_CHANNEL']
        //         }, {
        //             id: role.id,
        //             allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        //         }, {
        //             id: "330877657132564480",
        //             allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        //         }])
        //         await chan.setParent(category);
        //     } catch (e) {console.log(chalk.red(e.toString()))}
        //     await delay(2000);
        //     console.log(chalk.blue("NEXT!"))
        // }
    },
    info: {
        description: "Creates new concert channels",
        argnum: 0,
        example: "!addconcerts",
        category: "Staff"
    }
}