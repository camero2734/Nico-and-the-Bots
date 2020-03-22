module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("No.");

        let editString = "";

        for (let channel in autoreactJSON) {
            for (let emoji in autoreactJSON[channel]) {
                editString += `<#${channel}> ${toEmoji(emoji)} ${listOptions(autoreactJSON[channel][emoji])}\n`
            }
        }

        await msg.channel.send(`__**Auto React Rulesheet**__\n\`\`\`${editString.trim()}\`\`\`\n>>> 1. Copy text from box\n2. Edit by adding, removing, or changing lines as needed\n3. Send again within 120 seconds to save changes (**do not put it inside of a code block**)\n\n__**General format:**__ #channel :emoji: (messages) (images) @User1 @User2`);


        // HANDLE REPLY
        let reply = await msg.channel.awaitMessage(msg.member, null, 120 * 1000);
        if (!reply) return msg.channel.embed("You chose not to make the changes. That's okay.");

        let newJSON = {};
        let lines = reply.content.split("\n");
        for (let line of lines) {
            try {
                let [channel, emoji, ...args] = line.split(" ");
                let id = channel.match(/<#(\d+)>/)[1];

                let emojiReg = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+/
                if (/<:.*?:\d+?>/.test(emoji)) {
                    emoji = emoji.match(/<:.*?:(\d+?)>/)[1];
                } else if (emojiReg.test(emoji)) {
                    emoji = emoji.match(emojiReg)[0];
                } else throw new Error(`Invalid emoji provided - ${emoji}`);

                args = args.map(a => a.toLowerCase());
                let images = args.indexOf("images") === -1 ? false : true;
                let messages = args.indexOf("messages") === -1 ? false : true;
                let embeds = args.indexOf("embeds") === -1 ? false : true;

                if (!images && !messages && !embeds) throw new Error("At least one of `images` or `messages` or `embeds` has to be set for each line.")

                let [...users] = args.join(" ").matchAll(/<@!{0,1}(\d+?)>/g);
                users = users.map(u => u[1]);

                if (users.length === 0) users = true;

                if (!newJSON[id]) newJSON[id] = {};
                newJSON[id][emoji] = { messages, images, embeds, users };
            } catch(e) {
                try {
                    console.log(e);
                    msg.channel.embed(e.message)
                } finally {
                    return msg.channel.embed("Error parsing your answer. Try again.")
                }
            }
        }

        // Verify the outcome is correct
        let additions = 0;
        let deletions = 0;
        let modifications = 0;
        let originalLines = editString.trim().split("\n");
        for (let i = 0; i < originalLines.length; i++) {
            if (lines.some(l => l.trim().replace(/<@!/g, "<@") === originalLines[i].trim().replace(/<@!/g, "<@"))) continue; // Line the same, no difference
            else {
                let channelEmoji = originalLines[i].split(" ").slice(0, 2).join(" ");
                if (lines.some(l => l.split(" ").slice(0, 2).join(" ") === channelEmoji)) {
                    console.log(originalLines[i], lines.find(l => l.split(" ").slice(0, 2).join(" ") === channelEmoji));
                    modifications++; // Lines aren't the same, but they do reference the same channel and emoji
                } else {
                    deletions++;
                }
            }
        }
        additions = lines.length - originalLines.length + deletions;

        if (additions + deletions + modifications === 0) return msg.channel.embed("You chose not to make the changes. That's okay.");

        let embed = new Discord.RichEmbed()
                        .setTitle("You are about to change the auto react rulesheet")
                        .setDescription(lines.join("\n") + "\n\n**Are you sure you want to save these changes?**")
                        .addField("Additions", additions, true)
                        .addField("Deletions", deletions, true)
                        .addField("Modifications", modifications, true);

        await msg.channel.send(embed);

        let sendAnswer = await msg.channel.awaitMessage(msg.member, null, 120 * 1000);
        if (!sendAnswer || sendAnswer.content.toLowerCase().indexOf("yes") === -1) return msg.channel.embed("You chose not to make the changes. That's okay.");


        // Write the file and update the JSON reference
        autoreactJSON = newJSON;
        await fs.promises.writeFile("./json/autoreact.json", JSON.stringify(newJSON, null, 4));

        await msg.channel.embed("Your changes have been made!");

        function toEmoji(emoji) {
            if (/^\d+$/.test(emoji)) {
                let emojiName = msg.guild.emojis.get(emoji).name;
                return `<:${emojiName}:${emoji}>`
            } else return emoji;
        }

        function listOptions(opts) {
            let list = "";
            if (opts.messages) list += "messages ";
            if (opts.images) list += "images ";
            if (opts.embeds) list += "embeds ";
            if (Array.isArray(opts.users)) {
                for (let u of opts.users) list += `<@${u}> `;
            }
            return list.trim();
        }
    },
    info: {
        aliases: false,
        example: "!autoreact",
        minarg: 0,
        description: "Initiates an editable rule table for auto reacts",
        category: "Info"
    }
}
