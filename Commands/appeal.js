module.exports = {
    execute: async function (msg) {
        let numQuestions = 15;
        let getQuestions = require("./questions.js");

        let questions = await getQuestions(numQuestions);

        let hours = 1;
        let reactionEmojis = ['1⃣', "2⃣", '3⃣', "4⃣", "5⃣", "6⃣"];
        let answers = [];
        let numWrong = 0;
        if (((!waitTimes[msg.author.id] || (waitTimes[msg.author.id] + (hours * 60 * 60 * 1000)) <= Date.now()) && !msg.member.roles.get("475388751711830066")) || msg.author.id === poot) {
            await msg.channel.embed(msg.member.displayName + ", I sent you a DM!")
            let dm;
            try {
                dm = await msg.author.createDM();
            } catch (e) {
                return msg.channel.embed("It appears as if you have disabled server DMs. They must be enabled for this command to work.");
            }

            let startEmbed = new Discord.RichEmbed()
                .setDescription("You are starting an application for #verified-theories. You must wait one hour between applications. You have 2 minutes to answer each question- if you don't answer in time, you have to restart but the one hour wait time won't be applied.\n\nDo not share answers or talk about the answers anywhere on the server. Using Google or searching anywhere (Reddit, Twitter, Discord,etc.) is FINE!\n\n**Good luck!**");

            await dm.send(startEmbed);

            for (let question of questions) {
                let qNum = questions.indexOf(question) + 1;
                let embed = new Discord.RichEmbed()
                    .setDescription(`(${qNum}/${numQuestions}) ` + question.text)
                    .setColor("RANDOM")
                    .setFooter("You have 2 minutes to answer each question. Answer by reacting.", bot.user.displayAvatarURL);
                for (let answer of question.answers) {
                    embed.addField(reactionEmojis[question.answers.indexOf(answer)] + " " + answer, "\u200B");
                }
                let m = await dm.send(embed);
                let linked = false;
                if (question.link) linked = await dm.send(question.link);
                for (let answer of question.answers) {
                    await m.react(reactionEmojis[question.answers.indexOf(answer)]);
                }

                const filter = (reaction, user) => {
                    return (reaction.message.channel.id === dm.id && user.id === msg.author.id && reactionEmojis.indexOf(reaction.emoji.name) !== -1);
                }
                try {
                    let collected = await m.awaitReactions(filter, {max: 1, maxEmojis: 1, time: 120 * 1000 });
                    if (!collected?.first()) return dm.send("You failed to answer this question within 2 minutes. You may restart the appeal process without waiting.");
                    let selected = collected.first().emoji.name;
                    let answer = "N/A";
                    let fields = m.embeds[0].fields;
                    for (let field of fields) {
                        if (field.name.startsWith(selected)) answer = field.name.replace(selected + " ", "");
                    }
                    answers.push(answer);
                    if (answer !== question.correct) numWrong++;
                    if (linked) await linked.delete();
                    await m.delete();
                } catch(e) {
                    dm.send("You failed to answer this question within 2 minutes or there was an error. You may restart the appeal process without waiting.");
                }
            }

            let appealEmbed = new Discord.RichEmbed()
                .setColor((numWrong > 0) ? "#FF0000" : "#00FF00")
                .setFooter(msg.createdAt.toString(), bot.user.displayAvatarURL)
                .setAuthor(msg.member.displayName + '  ' + msg.author.id)
                .setThumbnail(msg.author.displayAvatarURL);
            for (let i = 0; i < questions.length; i++) {
                if (!quizJSON[questions[i].text]) quizJSON[questions[i].text] = {};
                if (!quizJSON[questions[i].text][answers[i]]) quizJSON[questions[i].text][answers[i]] = 0;
                quizJSON[questions[i].text][answers[i]]++;
                await writeJsonFile('json/demaquiz.json', quizJSON);
                appealEmbed.addField(questions[i].text, '❔Input: ' + answers[i] + ` \n${answers[i]===questions[i].correct?"✅":"❌"}Answer: ` + questions[i].correct);
            }
            await msg.guild.channels.get(chans.appeals).send(appealEmbed);


            if (numWrong > 0) {
                waitTimes[msg.author.id] = Date.now();
                await writeJsonFile('json/waittimes.json', waitTimes);
                return dm.send(new Discord.RichEmbed({description: `You answered ${numWrong} question${numWrong===1?"":"s"} incorrectly in your appeal for #verified-theories! You can try again in 1 hour.`}).setColor("FF0000"));
            } else {
                await msg.member.addRole("475388751711830066");
                dm.send(new Discord.RichEmbed({description: "You answered all the questions correctly! You now have access to #verified-theories."}).setColor("00FF00"));
            }

        } else {
            if (msg.member.roles.get("475388751711830066")) {
                await msg.channel.embed("You already have the role for <#470335358970757145>!")
            } else {
                let timeString = calculateTimeRemaining((waitTimes[msg.author.id] + (hours * 60 * 60 * 1000)));
                await msg.channel.embed("You have " + timeString + " remaining before you can appeal again!");
                function calculateTimeRemaining(date) {
                    let now = Date.now()
                    let diff = date - now
                    var delta = Math.abs(diff) / 1000;
                    var days = Math.floor(delta / 86400).toString();
                    delta -= days * 86400;
                    var hours = (Math.floor(delta / 3600) % 24).toString();
                    if (days === "0") {
                        delta -= hours * 3600
                        var minutes = (Math.floor(delta/60) % 60).toString();
                        if (hours === "0") {
                            delta -= minutes * 60
                            var seconds = (Math.floor(delta) % 60).toString();
                            return (minutes + ` minute${parseInt(minutes) === 1 ? "" : "s"} and ` + seconds + ` second${parseInt(seconds) === 1 ? "" : "s"}`)
                        } else return (hours + ` hour${parseInt(hours) === 1 ? "" : "s"} and ` + minutes + ` minute${parseInt(minutes) === 1 ? "" : "s"}`)
                    } else return (days + ` day${parseInt(days) === 1 ? "" : "s"} and ` + hours + ` hour${parseInt(hours) === 1 ? "" : "s"}`)
                }
            }
        }
    },
    info: {
        aliases: ["appeal", "verifiedtheories"],
        example: "!appeal",
        minarg: 0,
        description: "Appeals to be added to <#470335358970757145>",
        category: "Other",
    }
}
