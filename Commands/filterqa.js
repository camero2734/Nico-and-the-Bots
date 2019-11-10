module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return;
        
        let qaItems = await connection.getRepository(Item).find({ type: "Q&A" });
        qaItems = qaItems.map(q => {
            let newObject = JSON.parse(q.title);
            newObject.id = q.id;
            return newObject;
        });

        let filterParamsArr = removeCommand(msg.content).split(" ");
        let filterParams = {};

        let mappings = {
            question: ["question", "q"],
            type: ["type", "kind"],
            for: ["for", "to", "who"],
            canask: ["canask", "hasmic", "asks"],
            isde: ["isde", "de", "deatheater"],
            page: ["page", "p"]
        };

        let footer = "";
        let pageNum = 1;
        let perPage = 10;

        for (let param of filterParamsArr) {
            let parts = /^(.*)[:=](.*)$/.exec(param);
            if (!parts || parts.length < 3) {
                if (/^\d$/.test(param)) pageNum = param; //page num, not a filter property
                continue;
            }
            let property = parts[1];
            let value = parts[2];
            property = Object.keys(mappings).find(key => mappings[key].some(prop => prop === property.toLowerCase()));
            if (!property) continue;
            if (property === "page") { //page num, not a filter property
                pageNum = value;
                continue;
            }

            filterParams[property] = value;
            footer += `${property}=${value}, `;
        }

        function valuesEqual(value1, value2) {
            if (value2.indexOf(value1) !== -1) return true;
            let acceptableYes = ["yes", "y", "true", "t"];
            let acceptableNo = ["no", "n", "false", "f"];

            console.log(value1, value2, acceptableYes.some(a => a === value1), acceptableYes.some(a => a === value2), /VALUES/);

            if (acceptableYes.some(a => a === value1) && acceptableYes.some(a => a === value2)) return true;
            if (acceptableNo.some(a => a === value1) && acceptableNo.some(a => a === value2)) return true;

            return false;
        }

        let tests = Object.keys(filterParams);
        
        qaItems = qaItems.filter(q => {
            for (let test of tests) {
                if (!valuesEqual(filterParams[test].toLowerCase(), q[test].toLowerCase())) return false;
            }
            return true;
        });
        let totalLength = qaItems.length;
        qaItems = qaItems.slice(perPage * pageNum - perPage, perPage * pageNum);


        if (qaItems.length === 0) return msg.channel.send(new Discord.RichEmbed({ description: "No q&a submissions meet these criteria" }).setColor("RED").setFooter(footer.substring(0, footer.length - 2) + ` page=${pageNum}`));

        let embed = new Discord.RichEmbed();
        
        for (let q of qaItems) {
            let member = msg.guild.members.get(q.id);
            let displayName = member ? `${member.displayName} (${member.id})` : "Unavailable member";
            embed.addField(displayName, `[${q.question.substring(0, 500)}${q.question.length > 500 ? "..." : ""}](https://discordapp.com/channels/269657133673349120/625466406397280256/${q.mid})`);
        }
        embed.setFooter(footer.substring(0, footer.length - 2) + ` page=${pageNum} total=${totalLength}`);
        await msg.channel.send(embed);
    },
    info: {
        aliases: false,
        example: "!filterqa",
        minarg: 0,
        description: "Filter submitted q&a questions",
        category: "Staff"
    }
};