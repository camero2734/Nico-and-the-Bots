module.exports = async function(data, msg) {
    const bot = msg.client;
    const color = require('color');
    let nodechart = require('../nodechart.js');
    return new Promise(resolve => {
        let labels = [];
        let numbers = [];
        let total = 0;
        let other = 0;
        for (let key in data) {
            let channel = bot.guilds.get('269657133673349120').channels.get(key)
            if (channel) {
                total += data[key]
            }
        }
        for (let key in data) {
            let channel = bot.guilds.get('269657133673349120').channels.get(key)
            if (channel && (data[key] / total > 0.02)) {
                if (numbers.length == 0) {
                    labels.push(channel.name.substring(0, 25))
                    numbers.push(data[key])
                } else {
                    let placed = false;
                    for (let i in numbers) {
                        if (numbers[i] > data[key] && !placed) {
                            placed = true
                            labels.splice(i, 0, channel.name.substring(0, 25))
                            numbers.splice(i, 0, data[key])
                        }
                    }
                    if (!placed) {
                        labels.push(channel.name.substring(0, 25))
                        numbers.push(data[key])
                    }
                }
            }
        }
        
        function genColors(baseColor, length) {const bc = color(baseColor); const baseHue = bc.hue(); const step = 240 / length; const arr = Array.apply(null, { length }).map(Number.call, Number); const steps = arr; return steps.map(s => bc.rotate((baseHue + step * s) % 240).hex()); }
        let colors = genColors("#F3C1AD", labels.length - 1)
        colors.unshift("#F3C1AD")
        nodechart(numbers.reverse(), labels.reverse(), colors).then((buffer) => {
            resolve(buffer)
        }).catch(e => console.log(e))
    })
}