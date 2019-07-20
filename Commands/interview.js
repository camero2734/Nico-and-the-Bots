module.exports = {
    execute: async function (msg) {
        const fetchVideoInfo = require('youtube-info');
        let args = msg.content.split(" ");
        let url = args[1];
        args.shift(); args.shift();
        let content = args.join(" ");

        if (!url) return msg.channel.embed("You must provide a url!");
        

        try {
            let id;
            if (url.indexOf("youtube.com/watch?v=") !== -1) {
                id = /(?<=watch\?v=).*?(?=$|&|\?)/.exec(url)[0];
            }
            else if (url.indexOf("youtu.be/") !== -1) {
                id = /(?<=youtu\.be\/).*?(?=$|&|\?)/.exec(url)[0];
            }
    
            if (!id) return msg.channel.embed("Invalid URL.");
    

            let currentIDS = await storage.getItem("interviewIDS");
            if (Array.isArray(currentIDS) && currentIDS.indexOf(id) !== -1) return msg.channel.embed("This video has already been submitted!");
            else {

                let m = await msg.channel.send(new Discord.RichEmbed().setDescription("Fetching video info...").setColor("#111111"));

                if (!currentIDS) currentIDS = [];
                currentIDS.push(id);

                let embed = new Discord.RichEmbed();
                let info = await fetchVideoInfo(id);
                
                let daysSince = Math.floor(Math.abs(((new Date()).getTime() - (new Date(info.datePublished)).getTime())/(24*60*60*1000))) - 1;
                embed.setAuthor(msg.member.displayName, msg.author.displayAvatarURL);
                embed.setTitle(info.title);
                embed.addField("Channel", info.owner, true);
                embed.addField("Views", info.views, true);
                embed.addField("Comments", info.commentCount, true);
                embed.addField("Link", "[Click Here](https://youtu.be/" + id + ")", true);
                embed.setImage(info.thumbnailUrl);
                embed.setDescription(content ? content : "No description provided");
                embed.setFooter("Uploaded " + (daysSince === 0 ? "today" : (daysSince === 1 ? "yesterday" : daysSince + " days ago")) + " || Add an interview with the !interview command");
                let m2 = await msg.guild.channels.get(chans.interviewsubmissions).send(embed);
                await m2.react("✅"); await m2.react("❌");
                await storage.setItem("interviewIDS", currentIDS);
                await m.edit(new Discord.RichEmbed().setColor("#111111").setDescription("Sent video to staff for approval!"));
            }
        } catch (err) {
            console.log(err, /ERR/)
        }
    },
    info: {
        aliases: ["interview", "submitinterview"],
        example: "!interview [Youtube Link] (Optional Descrption of Content)",
        minarg: 2,
        description: "Submits an interview for the #interviews channel.",
        category: "Other",
    }
}