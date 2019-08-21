module.exports = async function (msg, recap, recapRows) {
    return new Promise(async resolve => {
        if (msg.author.bot) resolve(false);
        else {
            const sendMsgStats = require("./sendMsgStats.js");
            const guild = msg.guild;
            let id = msg.author.id;
            let msgtosend = "**__Your daily recap!__**\n\n";
            sendMsgStats(recap, msg).then(async (buffer) => {
                let sorted = [];
                let total = 0;
                for (let key in recap) {
                    if (key !== "day") {
                        if (guild.channels.get(key)) {
                            let channelname = guild.channels.get(key).name;
                            let count = recap[key];
                            total += count;
                            sorted.push({ name: channelname, count: count });
                        }

                    }
                }

                sorted.sort(function (a, b) { return (a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0); });
                for (let h in sorted) {
                    sorted[h].percent = (~~(10000 * (sorted[h].count / total))) / 100;
                }

                let end = 0;
                for (let j = sorted.length - 1; j >= end; j--) {
                    msgtosend += "**" + sorted[j].name + "**: " + sorted[j].count + " message(s)  (**" + sorted[j].percent + "%**)\n";
                }
                let dmc = await msg.author.createDM();
                await dmc.send(msgtosend + "\n**__Total__**: " + total + " messages");
                await dmc.send({ file: buffer });
                await sendMessageLineGraph(dmc);
                resolve(true);
            }).catch(e => {console.log(e, /RESETRECAP/); resolve(false);});
        }
    });

    async function sendMessageLineGraph(dm) {
        let canvas = msg.Canvas.createCanvas(2000, 500);
        let ctx = canvas.getContext("2d");
        msg.Chart.defaults.global.animation = false;
        msg.Chart.defaults.global.responsive = false;
        msg.Chart.pluginService.register({
            beforeDraw: function (chart, easing) {
                ctx.save();
                ctx.fillStyle = "#36393F";
                ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);
                ctx.restore();
            }
        });
        let times = recapRows.map(r => r.time);
        let startOfDay = (new Date(Date.now() - 86400 * 1000)).setHours(0, 0, 0, 0);
        let endOfDay = startOfDay + 86400 * 1000;

        let data = [];

        data.push({ t: new Date(startOfDay), y: 0 });

        let count = 0;
        for (let i = 0; i < times.length; i++) {
            let msgTime = parseInt(times[i]);
            if (msgTime < startOfDay || msgTime >= endOfDay) continue;
            data.push({ t: new Date(parseInt(times[i])), y: ++count });
        }
    
        data.push({ t: new Date(endOfDay), y: count });

        var chart = new msg.Chart(ctx, {
            // The type of chart we want to create
            type: "line",
            data: {
                datasets: [{
                    label: "Messages/Time",
                    backgroundColor: "#fce300",
                    borderColor: "#ffffff",
                    data: data,
                    cubicInterpolationMode: "monotone",
                    pointBackgroundColor: "rgba(0, 0, 0, 0)",
                    pointBorderColor: "rgba(0, 0, 0, 0)"
                }]
            },
        
            // Configuration options go here
            options: {
                scales: {
                    xAxes: [{
                        type: "time",
                        time: {
                            unit: "minute"
                        },
                        distribution: "linear",
                        ticks: {
                            fontColor: "white",
                            stepSize: 1,
                            autoSkip: false,
                            callback: function(dataLabel, index) {
                                if (dataLabel.split(" ")[0].endsWith("00")) {
                                    return dataLabel.split(" ")[0].split(":")[0] + " " + dataLabel.split(" ")[1];
                                }
                                else return null;
                            }
                        },
                        scaleLabel: {
                            display: true,
                            labelString: "Time",
                            fontColor: "#ffffff"
                        }
                    
                    }],
                    yAxes: [{
                        ticks: {
                            fontColor: "white"
                        },
                        scaleLabel: {
                            display: true,
                            labelString: "Messages",
                            fontColor: "#ffffff"
                        }
                    }]
                
                }
            }
        });
        await dm.send(new msg.Discord.Attachment(chart.canvas.toBuffer(), "graph.png"));
    }
};