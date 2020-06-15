module.exports = {
    execute: async (msg) => {
        let epoch = new Date(2019, 6, 1); //JULY 1ST 2019
        let startOfToday = (new Date()).setHours(0, 0, 0, 0);
        let today = Math.round(Math.abs((epoch.getTime() - startOfToday) / (24 * 60 * 60 * 1000)));
        let recapRows = await connection.getRepository(Recap).find({ id: msg.author.id, day: today });
        let canvas = Canvas.createCanvas(2000, 500);
        let ctx = canvas.getContext("2d");
        Chart.defaults.global.animation = false;
        Chart.defaults.global.responsive = false;
        Chart.pluginService.register({
            beforeDraw: function (chart) {
                ctx.save();
                ctx.fillStyle = "#36393F";
                ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);
                ctx.restore();
            }
        });
        let times = recapRows.map(r => r.time);
        console.log(times);
        let startOfDay = (new Date(Date.now()).setHours(0, 0, 0, 0));
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
        console.log(data);
        var chart = new Chart(ctx, {
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
        await msg.channel.send(new Discord.Attachment(chart.canvas.toBuffer(), "graph.png"));
    },
    info: {
        aliases: false,
        example: "!msgtime",
        minarg: 0,
        description: "Shows a graph of your total messages over time for today",
        category: "Other"
    }
};