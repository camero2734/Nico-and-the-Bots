module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("You must be a staff member to use this command");

        const MSG_REQUIREMENT = 20;
        const numdays = 30; // How many days to average over
        const timePeriod = (n) => 1000 * 60 * 60 * 24 * n;

        let mentionedUser = msg.mentions?.users?.first();

        if (mentionedUser) { // Display info about a single user
            let startTime = Date.now();
            // Don't have a year's worth of data yet, take as much as possible:
            let epoch = 1584564139062;
            let daysSince = Math.floor((Date.now() - epoch) / (1000 * 60 * 60 * 24));
            daysSince = Math.min(daysSince, 365);

            let week = await connection.getRepository(MessageLog)
                .createQueryBuilder("wr")
                .select([`wr.user_id AS "id"`, `COUNT(wr.message_id) / 7 AS "avg"`]) // Avg daily messages
                .where(`wr.time >= ${Date.now() - timePeriod(7)} AND wr.user_id=${mentionedUser.id}`) // Over the last week
                .getRawOne();

            console.log(`After week: ${(Date.now() - startTime) / 1000} seconds`);

            let month = await connection.getRepository(MessageLog)
                .createQueryBuilder("wr")
                .select([`wr.user_id AS "id"`, `COUNT(wr.message_id) / 30 AS "avg"`]) // Avg daily messages
                .where(`wr.time >= ${Date.now() - timePeriod(30)} AND wr.user_id=${mentionedUser.id}`) // Over the last week
                .getRawOne();

            console.log(`After month: ${(Date.now() - startTime) / 1000} seconds`);

            let year = await connection.getRepository(MessageLog)
                .createQueryBuilder("wr")
                .select([`wr.user_id AS "id"`, `COUNT(wr.message_id) / ${daysSince} AS "avg"`]) // Avg daily messages
                .where(`wr.time >= ${Date.now() - timePeriod(daysSince)} AND wr.user_id=${mentionedUser.id}`) // Over the last week
                .getRawOne();

            console.log(`After year: ${(Date.now() - startTime) / 1000} seconds`);

            let embed = new Discord.RichEmbed().setColor("RANDOM")
                .setAuthor(msg.guild.member(mentionedUser).displayName, mentionedUser.displayAvatarURL)
                .addField("Over the last week", week.avg + " msgs/day")
                .addField("Over the last month", month.avg + " msgs/day")
                .addField(`Over the last ${daysSince === 365 ? "year" : `${daysSince} days`}`, year.avg + " msgs/day");

            return await msg.channel.send(embed);
        }


        let allDEs = msg.guild.roles.get("283272728084086784").members.array().filter(m => {
            return (!m.roles.get("330877657132564480"));
        });


        // AVERAGE DAILY MESSAGES
        let messagelog = await connection.getRepository(MessageLog)
            .createQueryBuilder("wr")
            .select([`wr.user_id AS "id"`, `COUNT(wr.message_id) / ${numdays} AS "avg"`]) // Avg daily messages
            .where(`wr.time >= ${Date.now() - timePeriod(numdays)}`) // Over the last X days
            .groupBy([`wr.user_id`])
            .orderBy("avg", "DESC")
            .getRawMany();

        let failingDEs = [];

        for (let de of allDEs) {
            try {
                let logUser = messagelog.find(wr => wr.id === de.user.id);
                if (!logUser) logUser = { id: de.user.id, avg: 0 };

                if (logUser.avg < MSG_REQUIREMENT) {
                    de.msgsDay = logUser.avg;
                    failingDEs.push(de);
                }
            } catch(e) {
                console.log(e, /MONITORDE_ERR/);
                continue;
            }

        }

        failingDEs = failingDEs.sort((a, b) => a.msgsDay - b.msgsDay);

        let embed = new Discord.RichEmbed().setTitle("Failing DEs").setFooter(`Failing: ${failingDEs.length}/${allDEs.length}\nUse !monitorde @user to view more info about a DE`);
        let allList = "";

        for (let i = 0; i < failingDEs.length; i++) {
            if (i < 25) embed.addField(failingDEs[i].displayName, failingDEs[i].msgsDay);
            allList += `**${failingDEs[i].displayName}** - \`${failingDEs[i].msgsDay} msgs/day\` (<@${failingDEs[i].id}>)\n`
        }

        if (msg.content.indexOf("all") !== -1) {
            msg.channel.send("__**Average Daily Messages (Past Month)**__\n" + allList + "\n*Use `!monitorde @user` to get more details about a user's activity*", {split: true});
        } else await msg.channel.send(embed);
    },
    info: {
        aliases: ["monitorde", "inactivede"],
        example: "!monitorde",
        minarg: 0,
        description: "Displays a list of current DE members that fall below the requirements",
        category: "Staff"
    }
};
