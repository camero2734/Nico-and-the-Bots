module.exports = {
    execute: async function(msg) {
        //if (msg.author.id !== poot && msg.channel.id !== chans.artistsubmissions) return msg.channel.embed("This command is not yet available.")
        let dm = await msg.member.createDM();
        if (!dm) return msg.channel.embed("I cannot DM you!");
        await msg.channel.embed("DM'd you!")
        await dm.embed("In order to complete your request, please upload a ZIP file containing all of the work you would like the staff to consider!\n\nIf you would like to leave a message, a link to a website with your art, or a note explaining your work, feel free to include a txt file!\n\n**Please keep the number of files below 10**. About 3 is preferable.");
        const filter = (m => {
            if (m.author.bot) return false;
            if (!m.attachments || !m.attachments.first() || !m.attachments.first().filename.toLowerCase().endsWith("zip")) {
                m.channel.embed("You must attach a zip file!");
                return false;
            }
            return m.author.id === msg.author.id;
        });
        try {
            let m = await dm.awaitMessage(msg.member, filter, 5 * 60 * 1000);
            if (!m.attachments || !m.attachments.first() || !m.attachments.first().filename.toLowerCase().endsWith("zip")) throw new Error("No zip file found");
            let url = m.attachments.first().url;
            let r = await snekfetch.get(url);
            await dm.embed("Unzipping and sending files, this may take a minute...")
            let artistChan = msg.guild.channels.get(chans.artistsubmissions);
            let embed = new Discord.RichEmbed().setColor("RANDOM").setAuthor(msg.member.displayName, msg.author.displayAvatarURL).setFooter(msg.author.id);
            let emMessage = await artistChan.send(embed);
            await emMessage.react("✅");
            await emMessage.react("❌");
            const zipFile = await yauzl.fromBuffer(r.body);
            let index = 0;
            await zipFile.walkEntries(async entry => {
                if (index++ >= 5) return;
                const readStream = await zipFile.openReadStream(entry);
                let attachment = new Discord.Attachment(readStream, entry.fileName);
                await artistChan.send(attachment);
                await new Promise((next) => {
                    setTimeout(() => {
                        next();
                    }, 1500)
                })
            });
            await dm.embed("Thank you for your submission! The staff will review your file and make a decision as soon as possible!");
            zipFile.close();
            
            
            
        } catch(e) {
            console.log(e, /ERR/)
            dm.embed("Your request timed out! Please use `!am` again to start over!");
        }
        

    },
    info: {
        aliases: ["am", "artistrole", "musicianrole"],
        example: "!am",
        minarg: 0,
        description: "Sends a request for the Artist/Musician role",
        category: "Roles",
    }
}