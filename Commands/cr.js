module.exports = {
    execute: async function (msg) {
        class Role {
            constructor(name, hex) {
                this.name = name;
                this.hex = hex.startsWith("#") ? hex : "#" + hex;
            }
        }

        let roles = [];

        roles.push(new Role("----------TIER 1----------", "#FFFFFF"));
        roles.push(new Role("Cheetah Tan", "#AB9D85"));
        roles.push(new Role("Vulture Brown", "#7e7064"));
        roles.push(new Role("Bandito Green", "#74774A"));
        roles.push(new Role("----------TIER 2----------", "#FFFFFF"));
        roles.push(new Role("No Pink Intended", "#b18f95"));
        roles.push(new Role("Regional at Blue", "#aebfd8"));
        roles.push(new Role("Dema Gray", "#9B9BAD"));
        roles.push(new Role("Jumpsuit Green", "#40BF80"));
        roles.push(new Role("----------TIER 3----------", "#FFFFFF"));
        roles.push(new Role("Ned Blue",  "#C6E2FF"));
        roles.push(new Role("March to the Cyan", "#60ffee"));
        roles.push(new Role("Holding on to Blue", "#4a83e6"));
        roles.push(new Role("Forest Green", "#11806a"));
        roles.push(new Role("Trees Green", "#a9ff9f"));
        roles.push(new Role("Kitchen Pink", "#FF9DAE"));
        roles.push(new Role("Chlorine Pink", "#ff7d9a"));
        roles.push(new Role("Pink You Out", "#FF1493"));
        roles.push(new Role("The Red and Go", "#EA3A3F"));
        roles.push(new Role("Rebel Red", "#FF0000"));
        roles.push(new Role("Torch Orange", "#FF8C00"));
        roles.push(new Role("Fairly Lilac", "#ccacea"));
        roles.push(new Role("Pantaloon Purple", "#8f81ff"));
        roles.push(new Role("Pet Cheetah Purple", "#7113bd"));
        roles.push(new Role("----------TIER 4----------", "#FFFFFF"));
        roles.push(new Role("Clancy Black", "#000001"));
        roles.push(new Role("DMAORG White", "#FFFFFE"));
        
        
        
        
        var canvas = new Canvas.Canvas(1600, 100 * roles.length);
        var ctx = canvas.getContext('2d');

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
            ctx.fillStyle = roles[i].hex;
            //ctx.strokeText(roles[i], 250, 100 * i + 50);
            let ending = roles[i].hex === "#FFFFFF" ? "" : ` (${roles[i].hex.toUpperCase()})`
            ctx.fillText(roles[i].name + ending, 400, 100 * i + 65);
            if (ctx.fillStyle.toUpperCase() === "#FFFFFF") ctx.fillStyle = "#000000";
            ctx.fillText(roles[i].name + ending, 1200, 100 * i + 65);
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