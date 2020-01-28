module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("You must be a staff member to use this command");

        if (!msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return this.embed(msg);

        //GET INFO
        let member = msg.mentions.members.first();

        let severity = null;
        let rule = null;

        // Determine if some information was already inputted
        if (msg.content.split(" ").slice(2).length > 0) {
            // A 9, A9, 9 A, 9A at end all valid
            let regex = /(?<rule>[BDSNO]) {0,1}(?<severity>\d{1,2})+$|(?<severity2>\d{1,2})+ {0,1}(?<rule2>[BDSNO])$/
            let result = regex.exec(msg.content);
            if (result) {
                severity = result.groups.severity === undefined ? result.groups.severity2 : result.groups.severity;
                rule = result.groups.rule === undefined ? result.groups.rule2 : result.groups.rule;

                if (severity !== undefined || rule !== undefined) {
                    msg.content = msg.content.replace(regex, "");
                }
            }
            
        }

        let explanation = msg.content.split(" ").slice(2).join(" ");
        if (explanation === "") explanation = null;

        let baseEmbed = {
            footer: {
                text: `Initiated by ${msg.member.displayName} [2 minutes to respond]`,
                icon_url: msg.author.displayAvatarURL
            },
            author: {
                name: `Creating warning for ${member.displayName}`,
                icon_url: member.user.displayAvatarURL
            }
        }

        if (!explanation) {
            let m = await msg.channel.send(new Discord.RichEmbed({...baseEmbed, description: `Please input the warning message. Remember to include all relevant details, including any changes the user needs to make.`}));
            let content_msg = await msg.channel.awaitMessage(msg.member, null, 120000);
            await new Promise(next => setTimeout(next, 300));
            await content_msg.delete();
            await m.delete();
            explanation = content_msg.content;
        }

        let rules = ["Bothering Others", "Drama", "Spam", "NSFW/Slurs", "Other"];

        if (!rule) {
            let askForRule = async (_in="") => {
                let newEmbed = new Discord.RichEmbed({...baseEmbed, description: `${_in}What rule did the user break? Please refer to the list below and respond with the **letter** of the rule broken.`});
                for (let _r of rules) {
                    newEmbed.addField(`${_r[0]}.`, _r);
                }
                let m = await msg.channel.send(newEmbed);
                let rule_msg = await msg.channel.awaitMessage(msg.member, null, 120000);
                await new Promise(next => setTimeout(next, 300));
                await rule_msg.delete();
                await m.delete();
                rule = rule_msg.content.toUpperCase();
                if (!rules.some(_r => _r.startsWith(rule))) await askForRule("Invalid letter. Try again.\n\n");
            }
            await askForRule();
        }
        
        if (!severity || (severity < 1 || severity > 10)) {
            let askForSev = async (_in="") => {
                let m = await msg.channel.send(new Discord.RichEmbed({...baseEmbed, description: `${_in}What severity was this action? Please rate it between **1** and **10**, with 1 being a very small warning, and 10 being a very serious warning.`}));
                let sev_msg = await msg.channel.awaitMessage(msg.member, null, 120000);
                await new Promise(next => setTimeout(next, 300));
                await sev_msg.delete();
                await m.delete();
                severity = sev_msg.content.toUpperCase();
                if (isNaN(severity) || severity < 1 || severity > 10) await askForSev("Invalid number. Try again.\n\n");
            }
            await askForSev();
        }

        let confirmationEmbed = new Discord.RichEmbed({...baseEmbed});
        confirmationEmbed.setTitle("Would you like to submit this warning?")
        confirmationEmbed.addField("Explanation", explanation);
        confirmationEmbed.addField("Rule Broken", rules.find(_r => _r.startsWith(rule)));
        confirmationEmbed.addField("Severity", severity);
        let con_m = await msg.channel.send(confirmationEmbed);

        let confirmation_msg = await msg.channel.awaitMessage(msg.member, null, 120000);
        
        await new Promise(next => setTimeout(next, 300));
        await confirmation_msg.delete();
        await con_m.delete();


        if (confirmation_msg.content.toLowerCase().indexOf("yes") !== -1) {
            confirmationEmbed.setTitle("Warning submitted.");
            await msg.channel.send(confirmationEmbed);

            //DM WARNED USER
            let dm = await member.createDM();
            confirmationEmbed.setTitle("You have received a warning")
            confirmationEmbed.setAuthor(member.displayName, member.user.displayAvatarURL);
            confirmationEmbed.setFooter(`Initiated by ${msg.member.displayName} || Please refrain from committing these infractions again. Any questions can be directed to the staff!`, msg.author.displayAvatarURL)
            await dm.send(confirmationEmbed);

            //INSERT WARNING TO DATABASE
            let warnData = { edited: false, given: msg.author.id, channel: msg.channel.id, rule: rules.find(_r => _r.startsWith(rule)), severity: parseInt(severity), content: explanation };
            let warn = new Item(member.id, JSON.stringify(warnData), "Warning", Date.now());
            await connection.manager.save(warn);
            staffUsedCommand(msg, "Warn", "#a4a516", { channel: msg.channel.toString(), User_warned: member.displayName, warning: explanation, severity_given: severity, rule: rule, time: (new Date()).toString() });
        } else {
            await msg.channel.embed("Warning cancelled. Use !warn to start again.")
        }
        
    },
    info: {
        aliases: false,
        example: "!warn @user",
        minarg: 1,
        description: "Warns a user",
        category: "Staff"
    }
};