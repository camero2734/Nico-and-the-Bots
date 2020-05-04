module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;

        let disallowedChannels = [chans.memes]; // Specific channels
        let disallowedCategories = [chans.staff, chans.staffventing, chans.submittedsuggestions, chans.commands, chans.incall]; // Category that contains listed channels

        disallowedCategories = disallowedCategories.map(c => msg.guild.channels.get(c).parentID);

        let time = 1440 * 60 * 1000; // minutes -> ms

        let channelMessages = await connection.getRepository(MessageLog)
            .createQueryBuilder("log")
            .select("log.channel_id, COUNT(log.message_id) AS count")
            .where(`log.time > ${Date.now() - time}`)
            .groupBy("log.channel_id")
            .getRawMany();

        let channels = {};
        for (let c of channelMessages) {
            channels[c.channel_id] = c.count;
        }

        let keys = Object.keys(channels);
        keys.sort((a,b) => -channels[a] + channels[b]);

        // Find largest and smallest values
        let max_val = 0;
        let min_val = Infinity;
        let avg = 0;
        let count = 0;
        for (let c in channels) {
            try {
                let chan = msg.guild.channels.get(c);
                if (disallowedChannels.indexOf(chan.id) !== -1 || disallowedCategories.indexOf(chan.parentID) !== -1) {
                    channels[c] = 0;
                    continue;
                }
            } catch (e) {
                continue;
            }

            max_val = Math.max(max_val, channels[c]);
            min_val = Math.min(min_val, channels[c]);
            avg += channels[c];
            count++;
        }
        avg = (avg - max_val) / (count - 1);


        console.log(max_val, /MAX/, avg, /AVG/)

        // Calculate pts multiplier for each channel
        const MAX_MULT = 1.5;
        const MIN_MULT = 0.5;
        const POWER = 4;
        let embed = new Discord.RichEmbed().setTitle("Message Log Results");
        for (let c of keys) {
            if (channels[c] === 0) continue;
            try {
                let name = msg.guild.channels.get(c).name;

                let multiplier = 1;
                if (channels[c] <= avg) { // (min_val, MAX), (avg, 1)
                    multiplier = 1 + (MAX_MULT - 1) * Math.pow((channels[c] - min_val) / (min_val - avg) + 1, POWER);
                } else { // (avg, 1), (max_val, MIN)
                    multiplier = MIN_MULT + (1 - MIN_MULT) * Math.pow((channels[c] - avg) / (avg - max_val) + 1, POWER);
                }

                console.log(channels[c] + " -> " + multiplier)
                embed.addField(name, `${channels[c]} - x${Math.round(multiplier * 100) / 100}`);
            } catch(e) {
                console.log(e);
                continue;
            }

        }
        embed.setFooter(`T = ${Math.round(time / (60000), 2)} minutes, AVG = ${avg}`)
        msg.channel.send(embed);
    },
    info: {
        aliases: false,
        example: "!channelmults",
        minarg: 0,
        description: "Displays current list of channel multipliers",
        category: "Staff"
    }
}
