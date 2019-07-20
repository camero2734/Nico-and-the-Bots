module.exports = {
    execute: function (msg) {
        if (msg.author.id !== poot) return msg.channel.send('Only pootus can doodus');
        try {
            if (!msg || !msg.attachments || !msg.attachments.first()) return msg.channel.embed("Please upload an image to change to");
            let attachment = msg.attachments.first().url;
            snekfetch.get(attachment).then((r) => {
                bot.user.setAvatar(r.body);
                console.log("Set avatar!");
            })
        } catch(e) {
            console.log(e, /ERROR/)
        }
        
    },
    info: {
        aliases: false,
        example: "!changepfp [uploaded image]",
        minarg: 0,
        description: "Changes Nico's pfp",
        category: "NA",
    }
}