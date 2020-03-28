module.exports = {
    execute: async function (msg) {
        // if (msg.author.id !== poot) return msg.channel.embed("Applications are currently closed");
        if (typeof openApps[msg.author.id] === "undefined") openApps[msg.author.id] = {};

        //if (!msg.member.roles.get("498702380007686146")) return msg.channel.embed("This command is currently only available to former death eaters. Applications for everyone will open soon!");
        let applyJSON = await loadJsonFile("./json/deapplications.json");
        let dm = await msg.member.createDM();
        if (!dm) return msg.channel.embed("I cannot DM you for some reason, please make sure you are not blocking DMs from this server!");

        const f = (m => (m.author.id === msg.author.id) && (m.content.toLowerCase().indexOf("yes") !== -1));
        const filter = (m => (m.author.id === msg.author.id));

        /*
        Reqs
        -Level
        -Warnings
        -Avg msgs/day
        -Length in server
        -Daily uses
        -Social Media
        */

        //CHECK IF ALREADY HAS DE
        if (msg.member.roles.get("283272728084086784")) {
            if (msg.content.endsWith(".")) msg.delete();
            else return msg.channel.embed("You are already a Death Eater!");
        }

        //CHECK IF RECENTLY APPLIED
        const WAIT_INTERVAL = 2592000000; //ONE MONTH (30 DAYS)
        const qTime = 3 * 60 * 1000;
        if (msg.author.id !== poot && applyJSON[msg.author.id] && applyJSON[msg.author.id].time && Date.now() - applyJSON[msg.author.id].time < WAIT_INTERVAL) {
            let diff = WAIT_INTERVAL - (Date.now() - applyJSON[msg.author.id].time);
            let days = Math.floor(diff / (1000 * 3600 * 24));
            diff-=days*(1000 * 3600 * 24);
            let hours = Math.floor(diff / (1000 * 3600));
            diff-=hours*(1000 * 3600);
            let minutes = Math.floor(diff / (1000 * 60));
            let timeString = days + " day" + (days === 1 ? " " : "s ") + hours + " hour" + (hours === 1 ? " and " : "s and ") + minutes + " minute" + (minutes === 1 ? "" : "s");
            return msg.channel.embed("You have already applied in the past month! Please wait " + timeString + " before applying again.");
        }
        if (applyJSON[msg.author.id] && typeof openApps[msg.author.id].invalid === "string") return msg.channel.embed(openApps[msg.author.id].invalid);

        await msg.channel.embed(msg.member.displayName + ", check your DMs to begin your application!");
        await dm.embed("**Welcome to your DE application!**");
        try {
            //DONT ALLOW MULTIPLE APPS AT ONCE
            openApps[msg.author.id].invalid = "You already have an open application! If this is an error, please contact poot.";
            await dm.embed("Are you applying as a prominent member of another community? (Most people should answer no)");
            let typeQ = await dm.awaitMessage(msg.member, filter);
            if (typeQ.content.trim().toLowerCase() === "yes") {
                const FOLLOWREQ = 8000;

                let qs = [];
                let questions = [];

                //QUESTIONS
                let sendCheckmark = async function(requirementMet, val, check, q, response1, response2, overrideAnswer) {
                    let embed = new Discord.RichEmbed().setDescription(q).setColor("RANDOM").setFooter("You have 3 minutes to respond");
                    await dm.send(embed);
                    let collected = await dm.awaitMessages(filter, { max: 1, time: qTime, errors: ["time"] });
                    let resp = { type: "checkmark", question: q, answer: overrideAnswer ? { content: overrideAnswer } : collected.first(), val: val, check: check, passed: requirementMet, pMessage: response1, fMessage: response2 };
                    qs.push(resp);
                    return resp;
                };
                let sendQuestion = async function (q) {
                    let embed = new Discord.RichEmbed().setDescription(q).setColor("RANDOM").setFooter("You have 3 minutes to respond");
                    await dm.send(embed);
                    let collected = await dm.awaitMessages(filter, { max: 1, time: qTime, errors: ["time"] });
                    let resp = { type: "question", question: q, answer: collected.first() };
                    qs.push(resp);
                    return resp;
                };

                await sendQuestion("Which platform is your account on? You may list multiple in a single message.");
                let accounts = qs[qs.length - 1].answer.content;

                let hasYoutube = /yt|you|tube/i.test(accounts);
                let hasInstagram = /ig|insta/i.test(accounts);
                let hasTwitter = /twit/i.test(accounts);

                if (!hasYoutube && !hasTwitter && !hasInstagram) {
                    openApps[msg.author.id].invalid = false;
                    return dm.embed("You did not enter any social media accounts. Please use `!applyde` again to restart. The only accepted social platforms are YouTube, Instagram, and Twitter.");
                }

                if (hasYoutube) {
                    let yt_res = await sendQuestion("Please enter a link to your YouTube channel.");
                    try {
                        let youtube_url = yt_res.answer.content.replace(/@/g, "").trim();
                        let response = await got(youtube_url);
                        let $ = cheerio.load(response.body);
                        let yt_pfp = $(".channel-header-profile-image").attr("src");
                        let name = $(".spf-link.branded-page-header-title-link.yt-uix-sessionlink").text();
                        let count = $(".yt-subscription-button-subscriber-count-branded-horizontal.subscribed.yt-uix-tooltip").text().replace(/,/g, "");
                        let embed = new Discord.RichEmbed().setTitle(name).setThumbnail(yt_pfp).addField("Subscribers", count);
                        await dm.send(embed);
                        let _question = "If this information is incorrect, please contact poot. Otherwise, respond with anything to continue...";
                        await sendCheckmark(count >= FOLLOWREQ, count, FOLLOWREQ, _question, "Has at least %check subscribers", "Does not have at least %check subscribers", count);
                    } catch(e) {
                        console.log(e);
                        await dm.send("Error! Note that the url must be in one of the following formats:\n\n`https://www.youtube.com/channel/UC_lIXUOOz5wAmE5YOyX2zpg` OR `https://www.youtube.com/user/twentyonepilots`");
                        throw new Error();
                    }
                }

                if (hasTwitter) {
                    let tw_res = await sendQuestion("Please enter your Twitter username or url.");
                    try {
                        let tw_user = tw_res.answer.content.replace(/@/g, "").trim();
                        let tw_url = tw_user.indexOf("twitter.com") === -1 ? "https://twitter.com/" + tw_user : tw_user;
                        qs[qs.length - 1].answer.content = tw_url;
                        let twit_res = await got(tw_url);
                        let $ = cheerio.load(twit_res.body);
                        let _text = $("#init-data").attr("value");
                        let json = JSON.parse(_text);
                        let count = json.profile_user.followers_count;
                        let disp_name = json.profile_user.name;
                        let description = json.profile_user.description;
                        let tw_pfp = json.profile_user.profile_image_url_https.replace("normal", "bigger");
                        let embed = new Discord.RichEmbed().setTitle(disp_name).setThumbnail(tw_pfp).setDescription(description).addField("Followers", count);
                        await dm.send(embed);
                        let _question = "If this information is incorrect, please contact poot. Otherwise, respond with anything to continue...";
                        await sendCheckmark(count >= FOLLOWREQ, count, FOLLOWREQ, _question, "Has at least %check followers", "Does not have at least %check followers", count);
                    } catch (err) {
                        console.log(err);
                        await dm.embed("Error! Please make sure you are entering a valid Twitter username (or a link).");
                        throw new Error();
                    }
                }

                if (hasInstagram) {
                    let ig_res = await sendQuestion("Please enter your Instagram username or url.");
                    try {
                        let ig_user = ig_res.answer.content.replace(/@/g, "").trim();
                        let ig_url = ig_user.indexOf("instagram.com") === -1 ? "https://www.instagram.com/" + ig_user : ig_user;
                        qs[qs.length - 1].answer.content = ig_url;

                        let ig_parts = ig_user.split("/");
                        ig_user = ig_user.endsWith("/") ? ig_parts[ig_parts.length - 2] : ig_parts[ig_parts.length - 1];

                        let ig_sm = new SocialMedia({ instaName: ig_user });
                        await ig_sm.load();
                        let ig_profile = await ig_sm.getInstagramProfile();
                        let bio = ig_profile.biography;
                        let ig_pfp = ig_profile.avatar;
                        let count = ig_profile.followers;
                        let ig_name = ig_profile.response.full_name;
                        let embed = new Discord.RichEmbed().setTitle(ig_name).setThumbnail(ig_pfp).setDescription(bio).addField("Followers", count);
                        await dm.send(embed);
                        let _question = "If this information is incorrect, please contact poot. Otherwise, respond with anything to continue...";
                        await sendCheckmark(count >= FOLLOWREQ, count, FOLLOWREQ, _question, "Has at least %check followers", "Does not have at least %check followers", count);
                    } catch(err) {
                        console.log(err);
                        await dm.embed("Error! Please make sure you are entering a valid Instagram username (or a link).");
                        throw new Error();
                    }
                }

                await sendQuestion("Briefly describe the type of content your account(s) post.");
                await sendQuestion("Why did you decide to join the server?");

                //Get passed/total
                let passedCount = 0;
                let total = qs.filter(q => { return q.type === "checkmark"; }).length;
                for (let q of qs) if (q.type === "checkmark" && q.passed) passedCount++;
                await submitAndEmbed(passedCount, total, qs);
            } else {
                //CONSTANTS N STUFF
                const LVLREQ = 40;
                const WARNREQ = 2;
                const MSGREQ = 50;
                const JOINREQ = new Date(1525150800000);


                //GET LEVELS AND STUFF

                //LEVEL
                let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
                if (!userEconomy) userEconomy = new Economy(msg.author.id);
                let level = userEconomy.alltimeLevel;

                //WARNINGS
                let userWarnings = await connection.getRepository(Item).find({ id: msg.author.id, type: "Warning" }) || [];
                let filtered = userWarnings.filter(uw => {
                    return uw.time >= (Date.now() - (1000 * 60 * 60 * 24 * 60));
                });
                let warnings = filtered.length;

                //AVERAGE DAILY MESSAGES
                let userWeekRecap = await connection.getRepository(WeekRecap).findOne({ id: msg.author.id });
                let days = [];
                if (userWeekRecap) days = JSON.parse(userWeekRecap.days);
                let msgsTotal = 0;
                for (let day of days) msgsTotal+=day;
                let msgsDay = Math.ceil(msgsTotal / 7);
                //JOIN DATE
                let joinDate = msg.member.joinedAt;

                let qs = [];
                let questions = [];

                //QUESTIONS
                let sendCheckmark = async function (requirementMet, val, check, question1, question2, response1, response2) {
                    let q = question1.replace(/%val/g, val) + "" + `, which ${requirementMet ? "meets the requirement. Please respond with anything to continue..." : "does not meet the requirement of " + question2.replace(/%check/, check) + ". If you would like to provide context to this, please respond with those details, otherwise reply with 'NA'."}`;
                    let embed = new Discord.RichEmbed().setDescription(q).setColor("RANDOM").setFooter("You have 3 minutes to respond");
                    await dm.send(embed);
                    let collected = await dm.awaitMessages(filter, { max: 1, time: qTime, errors: ["time"] });
                    qs.push({ type: "checkmark", question: q, answer: collected.first(), val: val, check: check, passed: requirementMet, pMessage: response1, fMessage: response2 });
                };
                let sendQuestion = async function (q) {
                    let embed = new Discord.RichEmbed().setDescription(q).setColor("RANDOM").setFooter("You have 3 minutes to respond");
                    await dm.send(embed);
                    let collected = await dm.awaitMessages(filter, { max: 1, time: qTime, errors: ["time"] });
                    qs.push({ type: "question", question: q, answer: collected.first() });
                };

                await sendCheckmark(level >= LVLREQ, level, LVLREQ, "Your current level is **%val**", "having level **%check**", "Level %val", "Level %val");
                await sendCheckmark(warnings <= WARNREQ, warnings, WARNREQ, "You have **%val** warnings", "having no more than **%check** warnings", "Only has %val warning(s)", "Has %val warnings");
                await sendCheckmark(msgsDay >= MSGREQ, msgsDay, MSGREQ, "You have **%val** average daily messages", "having at least **%check** average daily messages", "Averages %val messages per day", "Averages %val messages per day");
                if (!qs[qs.length - 1].passed) await sendCheckmark(joinDate <= JOINREQ, joinDate.toDateString(), JOINREQ.toDateString(), "You joined on **%val**", "joining before **%check**", "Joined %val", "Joined %val");

                // Free Response Questions
                await sendQuestion("Why do you want to be a Death Eater, and why are you qualified to be one? **Please be brief, but comprehensive in your response; *your response should not just be that you want to talk in vulture valley!***");
                await sendQuestion("Besides being a member of the server, what are some other ways you are involved in the Twenty One Pilots community as a whole?");

                await sendQuestion("How well do you get along with other members of the server? Please explain your answer.")
                await sendQuestion("Is there any questionable behavior that the staff might find upon reviewing your messages/warnings/server history? If so, please explain and provide context to this. **Be as thorough as possible.**");

                await sendQuestion("What do you like/dislike about the Discord Clique community?");
                await sendQuestion("Do you see any specific, serious issues with any current DEs (or the state of the Death Eater role as a whole) that you think needs addressing?")

                await sendQuestion("If you have any other comments regarding your application or your qualification, please leave them here.");



                //Get passed/total
                let passedCount = 0;
                let total = qs.filter(q => { return q.type === "checkmark"; }).length;
                for (let q of qs) if (q.type === "checkmark" && q.passed) passedCount++;
                await submitAndEmbed(passedCount, total, qs);
            }

            async function submitAndEmbed(passedCount, total, qs) {
                const PERCENTREQ = 0.6;
                //CREATE EMBED
                let embed = new Discord.RichEmbed().setColor(passedCount / total > PERCENTREQ ? "#00FF00" : "#FF0000").setTitle("DE Application");
                embed.setAuthor(msg.author.username + "#" + msg.author.discriminator, msg.author.displayAvatarURL);
                for (let q of qs) {
                    if (q.type === "checkmark") {
                        let passedMessage = q.pMessage.replace(/%val/g, q.val).replace(/%check/g, q.check);
                        let failedMessage = q.fMessage.replace(/%val/g, q.val).replace(/%check/g, q.check);
                        embed.addField(q.passed ? "✅ " + passedMessage : "❌ " + failedMessage, q.answer.content);
                    } else {
                        embed.addField("❔ " + q.question, q.answer);
                    }

                }
                embed.setFooter(msg.author.id).setTitle("DE Application");



                await dm.send(embed);

                //ASK TO SUBMIT
                await dm.embed("Would you like to submit your application? **You meet " + passedCount + "/" + total + " of the requirements.** Remember, you can only apply once per month!\n\n`If you would like to submit it, please reply with YES`");
                let response = await dm.awaitMessages(filter, { max: 1, time: qTime, errors: ["time"] });
                if (response.first().content.toLowerCase().indexOf("yes") !== -1) {
                    //SEND TO STAFF
                    let appChannel = msg.guild.channels.get(chans.deapplications);
                    let staffMsg = await appChannel.send(embed);
                    await staffMsg.react("✅");
                    await staffMsg.react("❌");
                    //MARK AS SUBMITTED
                    dm.embed("Your application has submitted!");

                    //UPDATE JSON
                    if (!applyJSON[msg.author.id]) applyJSON[msg.author.id] = {};
                    applyJSON[msg.author.id].time = Date.now();
                    await writeJsonFile("./json/deapplications.json", applyJSON);
                } else {
                    dm.embed("You have chosen to not submit your application. You can restart your application at any time by simply saying `!applyde` again!");
                }
                if (applyJSON[msg.author.id]) {
                    openApps[msg.author.id].invalid = false;
                    await writeJsonFile("./json/deapplications.json", applyJSON);
                }
            }

        } catch(e) {
            console.log(e, /DEE/);
            if (applyJSON[msg.author.id]) {
                openApps[msg.author.id].invalid = false;
                await writeJsonFile("./json/deapplications.json", applyJSON);
            }
            return dm.embed("Your application timed out! If you still want to apply, use the command again in the server.");
        }
    },
    info: {
        aliases: ["applyde", "deapply", "getde"],
        example: "!applyde",
        minarg: 0,
        description: "Generates an application (in DMs) for Death Eaters. Anyone may apply, but you may only apply once a month.",
        category: "NA"
    }
};
