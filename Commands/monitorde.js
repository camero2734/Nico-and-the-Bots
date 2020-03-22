module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("You must be a staff member to use this command");

        let allDEs = msg.guild.roles.get("283272728084086784").members.array().filter(m => {
            return (!m.roles.get("330877657132564480"));
        });


        let failingDEs = [];

        for (let de of allDEs) {
            try {
                // AVERAGE DAILY MESSAGES
                let userWeekRecap = await connection.getRepository(WeekRecap).findOne({ id: de.user.id });
                let days = [];
                if (userWeekRecap) days = JSON.parse(userWeekRecap.days);
                let msgsTotal = 0;
                for (let day of days) msgsTotal += day;
                let msgsDay = Math.ceil(msgsTotal / 7);

                if (msgsDay < 50) {
                    de.msgsDay = msgsDay;
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
        aliases: false,
        example: "!monitorde",
        minarg: 0,
        description: "Displays a list of current DE members that fall below the requirements",
        category: "Staff"
    }
};
