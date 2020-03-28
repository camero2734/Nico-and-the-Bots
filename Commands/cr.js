module.exports = {
    execute: async function (msg) {
        let roles = await getColorRoles({ guild: msg.guild, Discord, chans });


        let canvas = new Canvas.Canvas(2400, 100 * roles.length);
        let ctx = canvas.getContext('2d');

        Canvas.registerFont(('./assets/fonts/h.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/f.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/NotoEmoji-Regular.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/a.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/j.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/c.ttf'), { family: 'futura' }); // eslint-disable-line max-len
        Canvas.registerFont(('./assets/fonts/br.ttf'), { family: 'futura' }); // eslint-disable-line max-len

        ctx.textAlign="center";
        ctx.strokeStyle = "#FFFFFF";
        ctx.font="50px futura";

        for (let i = 0; i < roles.length; i++) {
            ctx.fillStyle = "#36393F";
            ctx.fillRect(0, 100 * i, 800, 100);
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(800, 100 * i, 800, 100);
            ctx.fillStyle = "#000000";
            ctx.fillRect(1600, 100 * i, 800, 100);
            ctx.fillStyle = roles[i].hex;
            let ending = roles[i].hex === "#FFFFFF" ? "" : ` (${roles[i].hex.toUpperCase()})`
            ctx.fillText(roles[i].name + ending, 400, 100 * i + 65);
            if (ctx.fillStyle.toUpperCase() === "#FFFFFF") ctx.fillStyle = "#000000";
            ctx.fillText(roles[i].name + ending, 1200, 100 * i + 65);
            if (ctx.fillStyle.toUpperCase() === "#000000") ctx.fillStyle = "#FFFFFF";
            ctx.fillText(roles[i].name + ending, 2000, 100 * i + 65);
        }

        msg.channel.send({file: canvas.toBuffer()})

    },
    info: {
        aliases: ['cr', 'colorrole', 'colorroles', 'viewcolors'],
        example: "!pootscommand",
        minarg: 0,
        description: "Does stuff",
        category: "Staff",
    }
}
