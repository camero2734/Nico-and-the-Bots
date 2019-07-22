module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;
        let m = await msg.channel.fetchMessage("602635979408408587");
        let newEmbed = new Discord.RichEmbed(m.embeds[0]);
        newEmbed.setThumbnail("attachment://albums.png");
        newEmbed.fields[0].name = "Song 1";
        newEmbed.fields[2].name = "Song 2";
        await m.edit(newEmbed);
    },
    info: {
        aliases: false,
        example: "!test",
        minarg: 0,
        description: "Test command",
        category: "NA",
    }
}


        // let bgURL = "https://i.imgur.com/SglNgFH.png";
        // let fgURL = await messageToImage(msg, 1200, 400);

        // let topLeft = { x: 3*214, y: 3*229.3333282470703 };
        // let topRight = { x: 3*520, y: 3*226.3333282470703 };
        // let botLeft = { x: 3*259, y: 3*287.3333282470703 };
        // let botRight = { x: 3*478, y: 3*285.3333282470703 };
        // let sign_buffer = await overlayImage(bgURL, fgURL, topLeft, topRight, botLeft, botRight, false, true);
        // if (!sign_buffer) return msg.channel.embed("Error!");
        // await msg.channel.send(new Discord.Attachment(sign_buffer, "overlay.png"));

/*
msg.content = removeCommand(msg.content);
let buffer = await messageToImage(msg, true);
msg.channel.send(new Discord.Attachment(buffer, "img.png"));
*/
// let role = "283272728084086784";


        // let m = await msg.channel.send(`Removing ${msg.guild.roles.get(role).name} role...`)
        // let members = msg.guild.roles.get(role).members.array();

        // for (let member of members) {
        //     await m.edit(`Removing ${msg.guild.roles.get(role).name} role from \`${member.displayName}...\``)
        //     member.removeRole(role);
        //     await new Promise(next => {
        //         setTimeout(() => {
        //             next();
        //         }, 1000)
        //     })
        // }

        // msg.channel.embed("Done.")

        // if (msg.author.id !== poot) return msg.delete();
        // if (!msg.mentions || !msg.mentions.users || !msg.mentions.users.first()) return;
        // let id = msg.mentions.users.first().id;
        // let msgsDay = 0;
        // if (msgcountJSON[id]) {
        //     for (let key in msgcountJSON[id]) msgsDay += msgcountJSON[id][key];
        // }
        // msgsDay = Math.floor(msgsDay / 7);
        // msg.channel.embed(msgsDay + " messages/day");


/*

if (msg.author.id !== poot) return msg.delete();
        if (!msg.mentions || !msg.mentions.users || !msg.mentions.users.first()) return;
        let id = msg.mentions.users.first().id;
        let msgsDay = 0;
        if (msgcountJSON[id]) {
            for (let key in msgcountJSON[id]) msgsDay += msgcountJSON[id][key];
        }
        msgsDay = Math.floor(msgsDay / 7);
        msg.channel.embed(msgsDay);


let id = "574731157061632000";
        
        // let mention = msg.mentions && msg.mentions.members && msg.mentions.members.first() ? msg.mentions.members.first() : null;
        
        // if (!mention) return msg.delete();

        //CLOWN UP
        console.log("peepee")
        if (msg.content.indexOf("add") !== -1) {
            let channels = msg.guild.channels.array();

            for (let chan of channels) {
                let perm = chan.permissionOverwrites.get(id);
                if (!perm && chan.id !== "569184705379827747") {
                    await chan.overwritePermissions(id, {
                        VIEW_CHANNEL: false
                    })
                }
            }
            
            // await mention.addRole("498702380007686146");
            // await mention.removeRole("283272728084086784");
            // await mention.addRole(id);

            msg.channel.embed("Done.");
            } else {
            let channels = msg.guild.channels.array();
            for (let chan of channels) {
                console.log(chan.name, /NAME/)
                try {
                    let perm = chan.permissionOverwrites.get(id);
                    if (perm) await perm.delete();
                } catch (e) {
                    msg.channel.embed(e.message ? e.message : e.toString());
                }

            }
            
            // await mention.removeRole("498702380007686146");
            // await mention.addRole("283272728084086784");
            // await mention.removeRole("569330362749026304")

            msg.channel.embed("Done.")
        }
*/


        // let content = removeCommand(msg.content);
        // await sql.run(`UPDATE scavenger SET hint="${content}" WHERE userId ="QUIET"`);



/*


try {
            let m = await msg.channel.send("Prepping...");
            let embed = new Discord.RichEmbed().setColor("RANDOM");
            embed.addField(`0`, `[🔴 Button 1](https://dmascavenge.info/button?id=${m.id}&channel=${m.channel.id}&option=1)`);
            embed.addField(`0`, `[🔵 Button 2](https://dmascavenge.info/button?id=${m.id}&channel=${m.channel.id}&option=2)`);
            await m.edit(embed);
        } catch(e) {
            console.log(e, /ERROR/)
        }
*/

/* CLOWN

*/