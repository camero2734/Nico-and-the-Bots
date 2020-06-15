module.exports = {
    execute: async function (msg) {
        let ruleNum = 1;
        const { Discord } = msg;
        class Rule {
            constructor(rule, description, category) {
                this.rule = rule;
                this.description = description;
                this.text = `**${rule}**\n${description}`;
                this.category = category;
                this.num = ruleNum++;
            }
            send() {
                let embed = new Discord.RichEmbed()
                            .setColor("#E6FAFC")
                            .setTitle(`Rule ${this.num}`)
                            .setDescription(this.text)
                            .setFooter(this.category);
                return msg.channel.send(embed);
            }
        }
        let rules = [
            new Rule(
                "Per Discord terms, you must be 13 or older to be in this server.",
                "Any user found to be below the age of 13 will be banned and may rejoin once they turn 13.",
            	"General"
    		),
            new Rule(
                "You may not use an alt/secondary account of any kind, especially for evasion of punishments",
                "You may only have one account on the server at a time. You may not *under any circumstances* join on another account if you are muted, warned, or have any other actions taken against you. This will result in a permanent ban against you.",
            	"General"
    		),
            new Rule(
                "Listen to the staff; DM an admin if there is a major problem",
                "You may contact the staff by DM'ing them, using the !suggest command (when relevant), or by sending Nico (the bot) a DM ending with `??`.",
            	"General"
    		),
            new Rule(
                "Try not to find loopholes to justify bad behavior (Use common sense)",
                "The server rules list can never be completely exhaustive - any common sense rules also apply, as well as a common sense understanding of the listed rules.",
            	"General"
    		),
            new Rule(
                "Spamming messages or images is not allowed",
                "This includes sending the same content repeatedly, or just sending many messages in a short time period.",
            	"Messaging"
    		),
            new Rule(
                "No NSFW or use of slurs, regardless of context",
                "This will almost always result in a ban.",
            	"Messaging"
    		),
            new Rule(
                "Never post personal information. This includes information such as full name, address, etc.",
                "You should always be careful posting any information that someone can use to identify you. Remember, this is a public server, so tens of thousands of people have access to anything you post here.",
            	"Messaging"
    		),
            new Rule(
                "Make sure to direct content to their appropriate channels (i.e. bot use in #commands)",
                "If you send messages that don't belong in a channel, you will simply be asked to move to the appropriate channel. Most channels are named in a way that you can easily identify their purpose!",
            	"Messaging"
    		),
            new Rule(
                "No advertising other Discord servers",
                "This especially applies to large servers, but also even to small, personal ones. (If you find friends on the server and want to invite them to a friend group, just DM them!)",
            	"Messaging"
    		),
            new Rule(
                "Respect everyone",
                "This applies even if you don't like someone; this is not the place for expressing that.",
            	"Interpersonal Conduct"
    		),
            new Rule(
                "Do not make others feel uncomfortable",
                "If someone directly asks you to stop talking about something because it makes them uncomfortable, please do.",
            	"Interpersonal Conduct"
    		),
            new Rule(
                "Do not cause public drama",
                "Whether it is drama from other servers or from this one, this is not the place to discuss it.",
            	"Interpersonal Conduct"
    		),
            new Rule(
                "Publicly posting negative statements about other members on social media or other servers is strictly prohibited.",
                "This mainly applies to social media sites (Twitter, Instagram, etc.) or other Discord servers. If you see this type of targeted harassment happen, please report it to a staff member.",
                "Interpersonal Conduct"
            )
        ];

        let rule = msg.content.split(" ")[1];
        if (!isNaN(rule) && rule > 0 && rule <= rules.length) {
            rules[rule - 1].send();
        } else {
            let options = {
                shouldSort: true,
                includeScore: true,
                threshold: 0.6,
                location: 0,
                distance: 100,
                minMatchCharLength: 1,
                keys: ["rule"]
            };
            let fuse = new Fuse(rules, options);
            let results = fuse.search(rule);
            if (results.length > 0) results[0].item.send();
            else msg.channel.embed("Rule not found");
        }
    },
    info: {
        aliases: false,
        example: "!rule [# or search term]",
        minarg: 0,
        description: "Returns a description of the rule",
        category: "Info"
    }
}
