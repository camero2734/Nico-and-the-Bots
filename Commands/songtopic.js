module.exports = {
    execute: function (msg) {
        var sortAlphabets = function (text) {
            return text.split('').sort().join('');
        }
        var shuffleText = function (text) {
            let array = text.split('')
            shuffle(array)
            return array.join('')
        }
        let rip = msg.content.toLowerCase()
        if (msg.author.id === '207129652345438211') return msg.channel.send('`You are not allowed to use this command.`')
        let looptimes = 0
        let recursive = false
        let am = 50
        if (msg.content.indexOf('pastebin') !== -1) am = 1
        if (rip.startsWithP("songtopicturer") || rip.startsWithP("songtopicr")) {
            let args = msg.content.split(' ')
            let input = args[0]
            looptimes = 50
            // msg.channel.send(input.substring(11))
            if (parseInt(input.substring(11)) / parseInt(input.substring(11)) === 1) looptimes = parseInt(input.substring(11))
            if (looptimes > 10000) return msg.channel.send('`Max # of loops is 10,000`')
            recursive = true
            am = 1
            msg.channel.send('`Used with -r option (repeats input ' + looptimes + ' times for a bigger, patterned effect)`')
        }
        let args = msg.content.split(' ')
        let wordArray = []
        let r = 0; let g = 0; let b = 0;
        let size = 20
        let lyrics = msg.removeCommand(msg.content)
        if (lyrics.includes('pastebin')) {
            snekfetch.get(lyrics).then((r) => {
                fs.writeFile('./tempfile.txt', r.body, (err) => {
                    if (err) console.log(err)
                })
                msg.channel.send('`Grabbing from pastebin...`')
                setTimeout(() => {
                    lyrics = fs.readFileSync('./tempfile.txt', 'utf8')
                    finishhim()
                }, 500)
            })
        } else { finishhim() }
        function finishhim() {
            let templyrics = lyrics
            for (let i = 0; i < looptimes; i++) {
                lyrics += " " + templyrics
            }
            if (msg.content.endsWith('!sort')) {
                lyrics = lyrics.replace(/sort/g, '')
                lyrics = sortAlphabets(lyrics)
            }
            if (msg.content.endsWith('!shuffle')) {
                lyrics = lyrics.replace(/shuffle/g, '')
                lyrics = shuffleText(lyrics)
            }
            lyrics = lyrics.replace(/\/n/g, '')
            let words = lyrics.split('')
            size = ~~(Math.sqrt(words.length)) + 1
            if (Math.sqrt(words.length) === ~~(Math.sqrt(words.length))) size = ~~(Math.sqrt(words.length))
            var canvas = new Canvas.Canvas(size * am, size * am)
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = 'black'
            ctx.fillRect(0, 0, size * am, size * am)
            for (let i = 0; i < words.length; i++) {
                wordArray.push((getValue(words[i])))
            }
            function point(x, y, ctx, wordArray, indexVal) {
                ctx.fillStyle = 'rgba(' + wordArray[indexVal]['r'].toString() + ',' + wordArray[indexVal]['g'].toString() + ',' + wordArray[indexVal]['b'].toString() + ',1)'
                ctx.fillRect(i * am, j * am, 1 * am, 1 * am)
            }
            for (i = 0; i < size; i++) {
                for (j = 0; j < size; j++) {
                    let indexVal = i + size * j
                    if (wordArray[indexVal]) {
                        ctx.strokeStyle = 'rgba(' + wordArray[indexVal]['r'].toString() + ',' + wordArray[indexVal]['g'].toString() + ',' + wordArray[indexVal]['b'].toString() + ',1)'
                        ctx.lineWidth = 1
                        point(i, j, ctx, wordArray, indexVal)
                    }
                }
            }
            function getValue(letter) {
                let alphabet = 'abcdefghijklmnopqrstuvwxyz.!@#$%^&*+;"=()\'|}{\\[]~<>?-_+1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                let index = alphabet.indexOf(letter) //+ 1
                if (letter === ' ') {
                    let r1 = 0
                    let g1 = 0
                    let b1 = 0
                    let toReturn = { r: r1, g: g1, b: b1 }
                    return (toReturn)
                }
                if (letter === 'z') {
                    let r1 = 255
                    let g1 = 255
                    let b1 = 255
                    let toReturn = { r: r1, g: g1, b: b1 }
                    return (toReturn)
                }

                let n = 65
                if (index < n) {
                    let mapped = index.map(0, n, 0, 1)
                    let rgb = numberToColour(mapped, 1, 0.5)
                    let toReturn = { r: ~~rgb[0], g: ~~rgb[1], b: ~~rgb[2] }
                    return (toReturn)
                } else {

                    let mapped = index.map(n, n + 26, 0, 1)
                    let rgb = numberToColour(mapped, 0.25, 0.25)
                    let toReturn = { r: ~~rgb[0], g: ~~rgb[1], b: ~~rgb[2] }
                    return (toReturn)
                }
            }
            let values = {}
            function colourToNumber(r, g, b) {
                return (r << 16) + (g << 8) + (b);
            }
            function numberToColour(h, s, l) {
                var r, g, b;
                if (s == 0) {
                    r = g = b = l; // achromatic
                } else {
                    var hue2rgb = function hue2rgb(p, q, t) {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1 / 6) return p + (q - p) * 6 * t;
                        if (t < 1 / 2) return q;
                        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                        return p;
                    }
                    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    var p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1 / 3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1 / 3);
                }
                return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
            }
            msg.channel.send(size + 'x' + size)
            msg.channel.sendFile(canvas.toBuffer())
        }
    },
    info: {
        aliases: false,
        example: "!songtopic weeeewooooo lets go eat dynamite jerky",
        minarg: 2,
        description: "Takes input and uhhh... makes it into colors?",
        category: "Fun",
    }
}