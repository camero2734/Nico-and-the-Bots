module.exports = async function (msg, recap, sendRecap) {
    return new Promise(async resolve => {
        if (msg.author.bot) resolve(false);
        else {
            const sendMsgStats = require('./sendMsgStats.js')
            const guild = msg.guild;
            let id = msg.author.id;
            let msgtosend = '**__Your daily recap!__**\n\n';
            sendMsgStats(recap, msg).then((buffer) => {
                let sorted = [];
                let total = 0;
                for (let key in recap) {
                    if (key !== 'day') {
                        if (guild.channels.get(key)) {
                            let channelname = guild.channels.get(key).name;
                            let count = recap[key];
                            total += count;
                            sorted.push({name: channelname, count: count});
                        }

                    }
                }

                sorted.sort(function (a, b) { return (a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0); });
                for (let h in sorted) {
                    sorted[h].percent = (~~(10000 * (sorted[h].count / total))) / 100;
                }

                let end = 0;
                for (let j = sorted.length - 1; j >= end; j--) {
                    msgtosend += '**' + sorted[j].name + '**: ' + sorted[j].count + ' message(s)  (**' + sorted[j].percent + '%**)\n';
                }

                msg.author.createDM().then((dmc) => {
                    dmc.send(msgtosend + '\n**__Total__**: ' + total + ' messages').then(() => {
                        dmc.send({ file: buffer });
                    })
                })
                resolve(true);
            }).catch(e => {console.log(e, /RESETRECAP/); resolve(false)})
        }
    })
}