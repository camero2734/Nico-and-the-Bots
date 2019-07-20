module.exports = {
    execute: async function (msg) {
        let sendFact = await myFunctions.senddaily(msg);
        if (sendFact) {
            let facts = [
                "If you're going to a concert, there are concert channels! Simply say `!concert CityName` to join yours.",
                "You can create a custom profile with `!createprofile`.",
                "If you boost the server with nitro, you can add a custom emoji! Use the `!boostemoji` command.",
                `You can buy color roles from <#${chans.shop}>! To see the colors of the available roles, use the \`!cr\` command.\n\n To view and equip your color roles, say \`!cc\`.`,
                "The `!createtag` command can be used to add a snippet of text that you can later make the bot send with the `!tag` command!",
                `You can submit an interview to <#${chans.interviews}> with the \`!interview\` command.`,
                "Use the `!topfeed` command to get a ping when Tyler or Josh post on social media, as well as when dmaorg.info updates!",
                "You can use the `!commands` command to view a list of commands (sorted into categories).",
                "You can follow us on [Twitter](https://twitter.com/discordclique) or on [Instagram](https://www.instagram.com/discordclique/)!",
                "We have a music bot - <@470705413885788160>! You can use `!play Clear twenty one pilots` to play the best song in existence.",
                `We have theory channels for talking about dmaorg.info/leaks/new stuff! <#${chans.leakstheories}> is available to everyone, and <#${chans.verifiedtheories}> is available to anyone who passes a short quiz!\nUse \`!appeal\` to take the quiz!`,
                `Check out <#${chans.creations}> and <#${chans.bestcreations}> to see user-submitted art!`,
                `Check out <#${chans.positivity}> for cute pets and words of encouragement!`,
                `Check out <#${chans.hiatusmemes}> for era-related memes!`,
                `Check out <#${chans.polls}> to vote on polls created by staff members!`,
                `Head over to <#${chans.suggestions}> to submit a suggestion about the server!`, 
                `Find a message really funny, or a piece of art really amazing? React with :gold: to give them gold! (Costs 1000 credits). \n\nTheir message will show up in <#${chans.houseofgold}>!`,
                "Stream Truce. Now."
            ];

            let randomFact = facts[Math.floor(Math.random() * facts.length)];
            let embed = new Discord.RichEmbed().setColor("RANDOM").setTitle("Daily Server Tip").setFooter("Have an idea for another server tip? Submit it with !suggest");
            embed.setDescription(randomFact);
            await msg.channel.send(embed);
        }
    },
    info: {
        aliases: false,
        example: "!daily",
        minarg: 0,
        description: "Sends a user their daily server credits",
        category: "Basic",
    }
}