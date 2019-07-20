module.exports = {
    execute: async function (msg) {
        class Role {
            constructor(name, hex) {
                this.name = name;
                this.hex = hex.startsWith("#") ? hex : "#" + hex;
            }
        }

        let rolesArr = [[], [], [], []];
        try {
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

            let index = -1;
            let songIndex = 0;
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].hex === "#FFFFFF") {
                    index++;
                    songIndex = 0;
                }
                else {
                    let role = msg.guild.roles.find(r => {return r.name.toLowerCase() === roles[i].name.toLowerCase()});
                    if (role) {
                        rolesArr[index][songIndex++] = role.id;
                    }
                    else console.log(roles[i].name + " " + roles[i].hex, /NOT FOUND/)
                }
            }
            //return console.log(rolesArr, /ROLESARR/);
        } catch(e) {
            console.log(e, /CCERR/)
        }
        try {
            
            if (!rolesArr || !rolesArr[0]) return msg.channel.embed("There was an error!");

            let row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`);
            if (!row) return msg.channel.embed("You have no color roles! Visit <#470331873105674250> to buy some.");
            let colorsS = row.colordata;
            if (!colorsS) return msg.channel.embed("You have no color roles! Visit <#470331873105674250> to buy some.");
            let colors = colorsS.split(",");
            if (colors.length <= 0) return msg.channel.embed("You have no color roles! Visit <#470331873105674250> to buy some.");
            if (msg.args.length <= 1) {
                let embed = new Discord.RichEmbed().setTitle("Your color roles");
                let description = "";
                for (let i = 0; i < rolesArr.length; i++) {
                    for (let j = 0; j < rolesArr[i].length; j++) {
                        let r = rolesArr[i][j];
                        if (colors.indexOf(r) !== -1) description+=`<@&${r}>` + "\n";
                    }
                }
                embed.setDescription(description);
                msg.channel.send(embed);
            } else {
                msg.args.shift();
                let query = msg.args.join(" ");
                let found = null;
                let hasRole = false;
                for (let c of colors) {
                    if (msg.guild.roles.get(c) && msg.guild.roles.get(c).name.toLowerCase().startsWith(query.toLowerCase())) found = c;
                }
                
                if (msg.member.roles.has(found)) hasRole = true;
                if (!found) return msg.channel.embed("You do not have this role!");
                else {
                    //REMOVE ALL OTHER ROLES
                    for (let i = 0; i < rolesArr.length; i++) {
                        for (let j = 0; j < rolesArr[i].length; j++) {
                            let r = rolesArr[i][j];
                            try {
                                if (msg.member.roles.get(r)) await msg.member.removeRole(r);
                            } catch(roleErr) {
                                msg.channel.embed("Unable to remove role: " + r.name);
                            }
                            
                        }
                    }
                    console.log(msg.member.roles.has(found));
                    if (hasRole) {
                        await msg.channel.embed("You have removed your `" + msg.guild.roles.get(found).name + "` role!");
                    } else {
                        await msg.member.addRole(found);
                        await msg.channel.embed("You now have the `" + msg.guild.roles.get(found).name + "` role activated!");
                    }
                    
                }
            }
        } catch(e) {
            console.log("There was en aroror!", e)
        }
        
        
    },
    info: {
        aliases: ['cc', 'choosecolor', 'choosecolors', 'pickcolor'],
        example: "!pootscommand2",
        minarg: 0,
        description: "Does stuff",
        category: "Staff",
    }
}