module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("You must be a staff member to use this command");

        const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

        let allDEs = msg.guild.roles.get("283272728084086784").members.array().filter(m => {
            return (!m.roles.get("330877657132564480"));
        });


        // AVERAGE DAILY MESSAGES
        let messagelog = await connection.getRepository(MessageLog)
            .createQueryBuilder("wr")
            .select([`wr.user_id AS "id"`, `COUNT(wr.message_id) / 7 AS "avg"`]) // Avg daily messages
            .where(`wr.time >= ${Date.now() - ONE_WEEK}`) // Over the last week
            .groupBy([`wr.user_id`])
            .orderBy("avg", "DESC")
            .getRawMany();

        let failingDEs = [];

        for (let de of allDEs) {
            try {
                let logUser = messagelog.find(wr => wr.id === de.user.id);
                if (!logUser) logUser = { id: de.user.id, avg: 0 };

                if (logUser.avg < 50) {
                    de.msgsDay = logUser.avg;
                    failingDEs.push(de);
                }
            } catch(e) {
                console.log(e, /MONITORDE_ERR/);
                continue;
            }

        }

        failingDEs = failingDEs.sort((a, b) => a.msgsDay - b.msgsDay);

        let embed = new Discord.RichEmbed().setTitle("Failing DEs").setFooter(`Failing: ${failingDEs.length}/${allDEs.length}`);
        let allList = "";

        for (let i = 0; i < failingDEs.length; i++) {
            if (i < 25) embed.addField(failingDEs[i].displayName, failingDEs[i].msgsDay);
            allList += `${failingDEs[i].displayName} - ${failingDEs[i].msgsDay}\n`
        }

        if (msg.content.indexOf("all") !== -1) {
            msg.channel.send(allList, {split: true});
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
