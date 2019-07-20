module.exports = {
    execute: async function (msg, args) {
        try {
            let query = removeCommand(msg.content);
            let matches = [];
            let allRoles = msg.guild.roles.array();
            for (let role of allRoles) {
                if (role.hexColor.toLowerCase() === "#3a74a2" || role.hexColor.toLowerCase() === "#4a74a2") {
                    if (query === "all") matches.push(role);
                    else {
                        let normalizedRoleName = role.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        let normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        if (normalizedRoleName.indexOf(normalizedQuery) !== -1) matches.push(role);
                    }
                    
                }
            }
            
            let embed = new Discord.RichEmbed({title: "Matches"}).setColor("RANDOM");
            let description = ""
            for (let i = 0; i < matches.length; i++) {
                description+= (i+1) + ": " + matches[i].name + "\n";
            }
            let dm = await msg.member.createDM();
            if (description === "") return dm.embed("No matches found!");
            await msg.channel.embed("DM'd you!");
            await dm.send(embed.setDescription(description));
            await dm.embed("Please reply with the number of the role you want");
            const filter = (m => {
                return (m.author.id === msg.author.id && parseInt(m.content) <= matches.length);
            })
            dm.awaitMessages(filter, { max: 1, time: 20000, errors: ['time'] })
                .then(collected => {
                    let answer = parseInt(collected.first());
                    let role = matches[answer - 1];
                    msg.member.addRole(role);
                    dm.embed("You now have the " + role.name + " role!")
                })
                .catch(collected => {
                    console.log(collected, /error/)
                    return dm.embed("Concert role selection cancelled.")
                });
        } catch(e) {console.log(e)}
        
    },
    info: {
        aliases: false,
        example: "!concert [City Name]",
        minarg: 2,
        description: "Adds your concert to the !concertlist",
        category: "Other",
    }
}

/*
// if (msg.content.toLowerCase().indexOf("diversion") !== -1) {
        //     if (msg.member.roles.get("487830747961360414")) {
        //         msg.member.removeRole("487830747961360414")
        //         msg.channel.embed("Your " + msg.guild.roles.get("487830747961360414").name + " role has been removed!")
        //     } else {
        //         msg.member.addRole("487830747961360414")
        //         msg.channel.embed("You now have the " + msg.guild.roles.get("487830747961360414").name + " role!")
        //     }
        //     return;
        // }
        let locations = ["Nashville, TN", "Chicago, IL", "St Louis, MO", "Milwaukee, WI", "St Paul, MN", "Cleveland, OH", "Detroit, MI", "Boston, MA", "Uniondale, NY", "Philadelphia, PA", "New York, NY", "Washington, DC", "Atlanta, GA", "Tampa, FL", "Sunrise, FL", "Houston, TX", "Dallas, TX", "Phoenix, AZ", "Inglewood, CA", "Oakland, CA", "Salt Lake City, UT", "Portland, OR", "Tacoma, WA", "Boise, ID", "Denver, CO", "Lincoln, NE", "Kansas City, MO", "Perth, AU", "Adelaide, AU", "Melbourne, AU", "Sydney, AU", "Brisbane, AU", "Auckland, NZ", "Kiev, UA", "Moscow, RU", "St Petersburg, RU", "Helsinki, FI", "Stockholm, SE", "Oslo, NO", "Copenhagen, DK", "Hamburg, DE", "Berlin, DE", "Lodz, PL", "Prague, CZ", "Vienna, AT", "Bologna, IT", "Zurich, CH", "Stuttgart, DE", "Cologne, DE", "Birmingham, UK", "Dublin, IE", "Belfast, UK", "Glasgow, UK", "Manchester, UK", "London, UK", "Paris, FR", "Amsterdam, NL", "Brussels, BE", "Bilbao, ES", "Madrid, ES", "Lisbon, PT"]
        function hslToHex(h, s, l) { h /= 360; s /= 100; l /= 100; let r, g, b; if (s === 0) { r = g = b = l } else { const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p }; const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3) }; const toHex = x => { const hex = Math.round(x * 255).toString(16); return hex.length === 1 ? '0' + hex : hex }; return `#${toHex(r)}${toHex(g)}${toHex(b)}` }
        function heat(value) { var h = (1.0 - Math.sqrt(value)) * 240; return hslToHex(h, 100, 50) }
        let setLocation = null;
        if (args[2]) {
            if (args[1].toLowerCase().indexOf('st') !== -1 && args[2].toLowerCase().indexOf('paul') !== -1) setLocation = "St Paul, MN"
            if (args[1].toLowerCase().indexOf('st') !== -1 && args[2].toLowerCase().indexOf('petersburg') !== -1) setLocation = "St Petersburg, RU"
        }
        for (let location of locations) {
            if (setLocation === null && location.toLowerCase().startsWith(args[1].toLowerCase())) {
                setLocation = location
            }
        }
        if (setLocation === null) return msg.channel.send("City not found! Note that roles for the second leg of the tour will not be available until after the last US show. Please check your spelling. If you believe this is an error, please contact poot.")
        setLocation = setLocation.replace(",", "")
        let cityRole = msg.guild.roles.find(v => v.name.toLowerCase() === setLocation.toLowerCase());
        if (!cityRole) {
            msg.guild.createRole({
                name: setLocation,
                color: heat(0),
                permissions: ["CHANGE_NICKNAME", "VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "USE_EXTERNAL_EMOJIS", "ADD_REACTIONS", "CONNECT", "SPEAK", "USE_VAD"],
                mentionable: false
            }).then((role) => {
                if (msg.member.roles.get(role.id)) {
                    msg.member.removeRole(role.id)
                    msg.channel.embed("Your " + role.name + " role has been removed!")
                } else {
                    msg.member.addRole(role.id)
                    let embed = new Discord.RichEmbed({ description: "You now have the " + role.name + " concert role!" }); embed.setColor(0);
                    msg.channel.send({ embed: embed })
                }
                
            })
        } else {
            if (msg.member.roles.get(cityRole.id)) {
                msg.member.removeRole(cityRole.id)
                msg.channel.embed("Your " + cityRole.name + " role has been removed!")
            } else {
                msg.member.addRole(cityRole.id)
                let largest = 1;
                for (let location of locations) {
                    
                    let otherRole = msg.guild.roles.find(v => v.name.toLowerCase() === location.replace(",", "").toLowerCase());
                    if (otherRole && otherRole.members.size > largest) largest = otherRole.members.size
                }
                ; (async function () {
                    for (let location of locations) {
                        await new Promise(next => {
                            let otherRole = msg.guild.rolesfind(v => v.name.toLowerCase() === location.replace(",", "").toLowerCase());
                            if (otherRole) otherRole.setColor(heat(otherRole.members.size / largest)).then(() => {next()})
                            else next()
                        })
                    }
                })()
                cityRole.setColor(heat(cityRole.members.size / largest))
                let embed = new Discord.RichEmbed({ description: "You now have the " + cityRole.name + " concert role!" }); embed.setColor(heat(cityRole.members.size / largest));
                msg.channel.send({ embed: embed })
            }
        }

*/