module.exports = {
    execute: async function (msg) {
        
        if (msg.author.id !== poot) return;

        let hex = msg.args.pop();
        msg.args.shift();
        let name = msg.args.join(" ");

        let role = await msg.guild.createRole({
            name: name,
            color: hex,
        })

        await role.setPosition(msg.guild.roles.get("470748389844451329").position + 1);

        await msg.channel.send(new Discord.RichEmbed().setColor(role.color).setDescription("Created " + role.name));

        // class Role {
        //     constructor(name, hex) {
        //         this.name = name;
        //         this.hex = hex.startsWith("#") ? hex : "#" + hex;
        //     }
        // }

        // let roles = [];
        // roles.push(new Role("Cheetah Tan", "#AB9D85"));
        // roles.push(new Role("Vulture Brown", "#7e7064"));
        // roles.push(new Role("Bandito Green", "#74774A"));
        // roles.push(new Role("Dema Gray", "#9B9BAD"));
        // roles.push(new Role("Regional at Blue", "#aebfd8"));
        // roles.push(new Role("No Pink Intended", "#b18f95"));
        // roles.push(new Role("Jumpsuit Green", "#11890a"));
        // roles.push(new Role("Trees Green", "#a9ff9f"));
        // roles.push(new Role("Ned Blue",  "#C6E2FF"));
        // roles.push(new Role("Chlorine Pink", "#ff7d9a"));
        // roles.push(new Role("Rebel Red", "#e43a3f"));
        // roles.push(new Role("Pet Cheetah Purple", "#7113bd"));
        // roles.push(new Role("Torch Orange", "#f8a763"));
        // roles.push(new Role("Holding on to Blue", "#4a83e6"));
        // roles.push(new Role("Kitchen Pink", "#ccacea"));
        // roles.push(new Role("Forest Green", "#11806a"));
        // roles.push(new Role("March to the Cyan", "#60ffee"));
        // roles.push(new Role("Clancy Black", "#000000"));
        // roles.push(new Role("DMAORG White", "#FFFFFE"));
        // roles.push(new Role("Neon Greenstones", "#8CFF00"));

        // msg.delete();
        
        // for (let i = 0; i < roles.length; i++) {
        //     await new Promise(async next => {
        //         console.log(i, /RI/)
        //         let r = roles[i];
        //         let role = await msg.guild.createRole({
        //             name: r.name,
        //             color: r.hex,
        //         })
        //         await role.setPosition(msg.guild.roles.get("470748389844451329").position + 1);
        //         msg.channel.send(new Discord.RichEmbed().setColor(role.color).setDescription("Created: " + role.name)).then((m) => {
        //             setTimeout(() => {
        //                 m.delete();
        //                 next();
        //             }, 2000);
        //         });
        //     })
        // }
        // console.log("done!")
    },
    info: {
        aliases: false,
        example: "!createrole [Role Name] [Hex Color]",
        minarg: 0,
        description: "Creates a role ezpz",
        category: "Staff",
    }
}