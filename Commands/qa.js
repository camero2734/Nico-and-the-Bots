module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("283272728084086784")) return;
        let item = await connection.getRepository(Item).findOne({ id: msg.author.id, type: "Q&A" });
        if (!global.qa) global.qa = {};
        if (global.qa[msg.author.id] === true) return msg.channel.embed("You already have started on your question!");

        if (!item) {
            let dm;
            try {
                global.qa[msg.author.id] = true;
                dm = await msg.author.createDM();
                await dm.embed("__What Q&A?__\n Recently we had [an impromptu voice chat](https://www.youtube.com/watch?v=R-vWYazTKe4&feature=youtu.be) with [Mark](https://twitter.com/ReelBearMedia).\n\nDuring this call, Josh said he would come back and do a proper Q&A in the server. **We want to give you an opporunity to ask a question!** Not only can you submit a question to be asked, but if yours is chosen, you will have an opporunity to ask the question yourself in the voice chat with Togg and Jogg! \n\n__**Please enter your question below**__. There will be some follow up questions to categorize your question! You have **two minutes** to answer each question.");
                let qMessage = await dm.awaitMessage(msg.member, null, 120 * 1000, null);
                
                await dm.embed("Is your question more funny or serious? Please label this accurately, there will be questions from both categories!\n\nRespond with `funny` or `serious`.");
                let tMessage = await dm.awaitMessage(msg.member, null, 120 * 1000, null);
                let type = ["funny", "serious"].find(a => tMessage.content.toLowerCase().startsWith(a));
                if (!type) throw new Error("IErr:You did not respond with a valid option, please restart");

                await dm.embed("Who is your question for?\n\nRespond with `Tyler`, `Josh`, or `Both`");
                let fMessage = await dm.awaitMessage(msg.member, null, 120 * 1000, null);
                let qFor = ["tyler", "josh", "both"].find(a => fMessage.content.toLowerCase().startsWith(a));
                if (!qFor) throw new Error("IErr:You did not respond with a valid option, please restart");

                await dm.embed("Do you have a mic (of decent quality) and would you be able to ask your question in vc (assuming the Q&A fits into your schedule)?\n\nRespond with `yes` or `no`.");
                let ynMessage = await dm.awaitMessage(msg.member, null, 120 * 1000, null);
                let yesNo = ["yes", "no"].find(a => ynMessage.content.toLowerCase().startsWith(a));
                if (!yesNo) throw new Error("IErr:You did not respond with a valid option, please restart");

                let embed = new Discord.RichEmbed().setColor("RANDOM");
                embed.setAuthor(msg.member.displayName, msg.author.displayAvatarURL);
                embed.addField("Question", qMessage.content.substring(0, 1000));
                embed.addField("Type", type);
                embed.addField("Question For", qFor);
                embed.addField("Can Ask", yesNo);
                let isDE = msg.member.roles.get("283272728084086784") ? "yes" : "no";
                embed.addField("Death Eater", isDE);
                embed.setFooter(new Date());
                await dm.send(embed);
                await dm.embed("Does this information look correct? Remember- you can only submit ONE question, so make sure this is the one you want!\n\nRespond with `yes` or `no`.");
                let finalMessage = await dm.awaitMessage(msg.member, null, 120 * 1000, null);
                let yes = ["yes"].find(a => finalMessage.content.toLowerCase().startsWith(a));
                if (!yes) throw new Error("IErr:You cancelled your current question- please restart!");
                else {
                    global.qa[msg.author.id] = false;
                    await dm.embed("Submitted! Thanks!");
                    let sentMID = (await msg.guild.channels.get("625466406397280256").send(embed)).id;
                    let questionItem = new Item(msg.author.id, JSON.stringify({
                        question: qMessage.content,
                        type,
                        for: qFor,
                        canask: yesNo,
                        isde: isDE,
                        mid: sentMID
                    }), "Q&A", Date.now());
                    connection.manager.save(questionItem);
                    console.log(questionItem);
                }
            } catch(e) {
                global.qa[msg.author.id] = false;
                console.log(e, /QA_ERROR/);
                if (!dm) return msg.channel.embed("It seems like you have server dm's turned off- this command requires you to enable this!");
                else return dm.embed(e.message && e.message.startsWith("IErr:") ? e.message.split("IErr:")[1] : "There was an error! Please restart.");
            }
        } else if (msg.author.id === poot) {
            await connection.manager.remove(item);
            await msg.channel.embed("Removed item!");
        } else return msg.channel.embed("Sorry, you have already submitted a question!"); //FIXME: maybe add an edit option?

        
        
    },
    info: {
        aliases: ["qa", "q&a"],
        example: "!qa",
        minarg: 0,
        description: "Submits a question for the Q&A",
        category: "Social"
    }
};