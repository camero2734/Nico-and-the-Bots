module.exports = {
    execute: async function(msg) {
        let nodechart = require('./nodechart.js')
        let quizJSON = await loadJsonFile('demaquiz.json')
        if (msg.author.id !== poot) return;
        let answers = quizJSON[msg.removeCommand(msg.content)]
        if (!answers) return msg.channel.embed("Invalid question.")
        keysSorted = Object.keys(answers).sort(function(a,b){return answers[a]-answers[b]})
        let labels = [];
        let numbers = []
        for (let key of keysSorted) {labels.push(key); numbers.push(answers[key])}

        function genColors(baseColor, length) { const color = require('color'); const bc = color(baseColor); const baseHue = bc.hue(); const step = 240 / length; const arr = Array.apply(null, { length }).map(Number.call, Number); const steps = arr; return steps.map(s => bc.rotate((baseHue + step * s) % 240).hex()); }
        let colors = genColors("#F3C1AD", labels.length - 1)
        colors.unshift("#F3C1AD")
        nodechart(numbers.reverse(), labels.reverse(), colors).then((buffer) => {
            msg.channel.send({ file: buffer })
        })
    },
    info: {
        aliases: false,
        example: "!sendstats",
        minarg: 2,
        description: "n/a",
        category: "Staff",
    }
}