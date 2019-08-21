module.exports = {
    execute: function (msg) {
        console.log("wait a minute...")
        profiles = JSON.parse(fs.readFileSync("./profiles.json", "utf8"))
        let id = msg.author.id
        if ((msg.mentions) && (msg.mentions.users) && (msg.mentions.users.first())) {
            id = msg.mentions.users.first().id
        }
        if (!profiles[id]) return msg.channel.send('`This profile has not been set up. Please use !createprofile to do so.`')
        var Image = Canvas.Image
        Canvas.registerFont(('./assets/fonts/h.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/f.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/NotoEmoji-Regular.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/a.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/j.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/c.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/br.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        var canvas = new Canvas.Canvas(500, 500)
        var ctx = canvas.getContext('2d');
        var background = new Image();
        var overlay = new Image();
        var img = new Image();
        var dark = new Image();
        overlay.src = './profiles/overlay.png'
        let backgroundimg = './profiles/st.png'
        if (msg.guild.members.get(id).roles.get(NPI)) backgroundimg = './profiles/npi.png'
        if (msg.guild.members.get(id).roles.get(RAB)) backgroundimg = './profiles/rab.png'
        if (msg.guild.members.get(id).roles.get(VSL)) backgroundimg = './profiles/vsl.png'
        if (msg.guild.members.get(id).roles.get(BF)) backgroundimg = './profiles/bf.png'
        background.src = backgroundimg
        dark.src = './profiles/darkener.png'
        fs.stat('./profilebgs/' + id + '.png', function (err, stat) {
            if (err == null) {
                background.src = './profilebgs/' + id + '.png'
                dotherest()
            } else {
                dotherest()
            }
        });

        async function dotherest() {
            ctx.drawImage(background, 0, 0, 500, 500)
            ctx.drawImage(dark, 0, 0, 500, 500)
            ctx.drawImage(overlay, 0, 0, 500, 500)

            var las = msg.guild.members.get(id).user.displayAvatarURL.split('?').reverse().pop();
            let las_r = await snekfetch.get(las);


            var myVar = setInterval(function () {
                img.onload = function () {
                    ctx.drawImage(img, 41, 28, 84, 83)
                    ctx.font = '30px "futura"'
                    ctx.fillStyle = msg.guild.members.get(id).displayHexColor
                    if (profiles[id]['color']) {
                        ctx.fillStyle = profiles[id]['color']
                    }
                    ctx.textAlign = 'start'
                    ctx.fillText(profiles[id]['name'] + '\'s', 154, 45)
                    ctx.textAlign = 'center'
                    ctx.font = '20px "futura"'
                    // ctx.fillText(profiles[id]['song'], 94, 240)
                    writeText(ctx, profiles[id]['song'], 94, 240, 20)
                    writeText(ctx, profiles[id]['album'], 94, 300, 20)
                    writeText(ctx, profiles[id]['band'], 94, 367, 20)
                    writeText(ctx, profiles[id]['genre'], 94, 430, 20)
                    ctx.textAlign = 'start'
                    let abouttext = profiles[id]['about']
                    writeText(ctx, abouttext, 200, 340, 20)
                    ctx.textAlign = 'center'
                    ctx.font = '18px "futura"'

                    writeText(ctx, profiles[id]['ig'], 273, 192, 20)
                    writeText(ctx, profiles[id]['twitter'], 405, 192, 20)
                    writeText(ctx, profiles[id]['steam'], 405, 252, 20)
                    writeText(ctx, profiles[id]['reddit'], 273, 252, 25)
                    msg.channel.sendFile(canvas.toBuffer())
                    clearInterval(myVar)
                }
                img.src = las_r.body;

            }, 100)
        }

        function writeText(ctx, text, x, ystart, ybuffer) {
            if (!text || typeof text === 'undefined') return
            let array = text.split('\n')
            if (array.length <= 1) {
                array = text.split('||')
            }
            for (let i in array) {
                let y = ystart + ybuffer * i
                ctx.fillText(array[i], x, y)
            }
        }

        return;
    },
    info: {
        aliases: false,
        example: "!profile (@ user)",
        minarg: 1,
        description: "Displays a user's profile",
        category: "Profile",
    }
}