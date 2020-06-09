module.exports = async function(data, checkRoles) {
    const { guild, Discord, chans } = data;

    console.log("Getting color roles")

    // Character put at end of each color role name to be able to find current color roles
    const UNIQUE_IDENTIFIER = "\u2063";

    class Role {
        constructor(name, hex) {
            this.name = name;
            this.hex = hex.startsWith("#") ? hex : "#" + hex;
            this.id = null;
            this.type = "role";
        }
    }

    class Divider extends Role {
        constructor(name, hex, credits, level, requiresDE=false) {
            super(name ,hex);
            this.type = "divider";
            this.credits = credits;
            this.level = level;
            this.requiresDE = requiresDE;
        }
    }

    let roles = [];

    roles.push(new Divider("TIER 1", "#FFFFFF", 7500, 10));
    roles.push(new Role("Cheetah Tan", "#AB9D85"));
    roles.push(new Role("Vulture Brown", "#7e7064"));
    roles.push(new Role("Bandito Green", "#74774A"));
    roles.push(new Divider("TIER 2", "#FFFFFF", 15000, 20));
    roles.push(new Role("No Pink Intended", "#B18F95"));
    roles.push(new Role("Regional at Blue", "#AEBFD8"));
    roles.push(new Role("Dema Gray", "#9B9BAD"));
    roles.push(new Role("Jumpsuit Green", "#40BF80"));
    roles.push(new Divider("TIER 3", "#FFFFFF", 25000, 50));
    roles.push(new Role("Ned Blue",  "#C6E2FF"));
    roles.push(new Role("March to the Cyan", "#60FFEE"));
    roles.push(new Role("Holding on to Blue", "#4a83e6"));
    roles.push(new Role("Forest Green", "#11806A"));
    roles.push(new Role("Trees Green", "#A9FF9F"));
    roles.push(new Role("Kitchen Pink", "#FF9DAE"));
    roles.push(new Role("Chlorine Pink", "#ff7d9a"));
    roles.push(new Role("Pink You Out", "#FF1493"));
    roles.push(new Role("Rebel Red", "#FF0060"));
    roles.push(new Role("The Red and Go", "#E86A6E"));
    roles.push(new Role("Torch Orange", "#F8A763"));
    roles.push(new Role("Fairly Lilac", "#ccacea"));
    roles.push(new Role("Pantaloon Purple", "#8F81FF"));
    roles.push(new Role("Pet Cheetah Purple", "#7113BD"));
    roles.push(new Divider("TIER 4", "#FFFFFF", 50000, 100));
    roles.push(new Role("Clancy Black", "#000001"));
    roles.push(new Role("DMAORG White", "#FFFFFE"));
    roles.push(new Divider("DExclusive", "#FFFFFF", 60000, 40, requiresDE=true));
    roles.push(new Role("Oh Mint Believer", "#C4FCCC"));
    roles.push(new Role("Silver Screen", "#BEC2CB"));
    roles.push(new Role("Trapdoorange", "#FFC400"));
    roles.push(new Role("Ode to Pink", "#FF85FC"));
    roles.push(new Divider("DExclusive II", "#FFFFFF", 100000, 40, requiresDE=true));
    roles.push(new Role("Bandito Yellow", "#FCE300"));


    if (!checkRoles) return await addProperties(roles);

    // Only continue on for shop.js
    try {

        let currentRoles = [];

        for (let r of guild.roles.array()) {
            let match = r.name.match(new RegExp(`^([A-z0-9 -]+)${UNIQUE_IDENTIFIER}$`));
            if (match && Array.isArray(match) && match[1] !== "") {
                currentRoles.push({ name: match[1], id: r.id });
            }
        }

        let addedRoles = [];

        let modifiedRoles = [];


        let getBasePos = () => guild.roles.get("326558916219502595").position; // 3rd place user of the month is before first color role
        let roleIndex = 0;
        for (let i in roles) {
            let r = roles[i];
            console.log(r.name, getBasePos(), roleIndex, getBasePos() - roleIndex);
            if (r.type !== "divider") {
                roleIndex++;
                let matchingRole = currentRoles.find(cr => cr.name === r.name);
                let colorRole = matchingRole && guild.roles.get(matchingRole.id);
                if (!colorRole) { // Not a current role, thus a new role has been added to the
                    // Create new song role
                    let newColorRole = await guild.createRole({
                        name: r.name + UNIQUE_IDENTIFIER,
                        color: r.hex,
                        position: getBasePos() - roleIndex
                    });

                    addedRoles.push(newColorRole);
                } else {
                    // Ensure roles are ordered correctly
                    if (colorRole.position !== getBasePos() - roleIndex) {
                        await colorRole.setPosition(getBasePos() - roleIndex);
                    }

                    if (colorRole.hexColor.toUpperCase() !== r.hex.toUpperCase()){ // Check if color changed
                        modifiedRoles.push(colorRole);
                        colorRole.setColor(r.hex);
                    }
                }
            }
        }

        let deletedRoles = [];

        for (let cr of currentRoles) {
            if (roles.some(r => cr.name === r.name)) continue;
            else { // There is a current role not in this list; deleted
                // Don't auto delete role, just add it to list to manually delete (just in case)
                deletedRoles.push(guild.roles.get(cr.id));
            }
        }


        let added = "";
        for (let ar of addedRoles) {
            added += `${ar}, `;
        }

        let removed = "";

        for (let dr of deletedRoles) {
            removed += `${dr}, `;
        }

        let modified = "";
        for (let mr of modifiedRoles) {
            modified += `${mr}, `;
        }


        if (added !== "" || removed !== "" || modified !== "") {
            let embed = new Discord.RichEmbed();
            if (added !== "") embed.addField("Added", added.split("").slice(0, -2).join(""));
            if (removed !== "") {
                embed.addField("Removed", removed.split("").slice(0, -2).join(""));
                embed.setFooter("Removed roles have to be manually removed to avoid catastrophies");
            }
            if (modified !== "") embed.addField("Modified", modified.split("").slice(0, -2).join(""));
            await guild.channels.get(chans.bottest).send(embed);
        } else {
            await guild.channels.get(chans.bottest).embed("No color role changes were made");
        }
    } catch(e) {
        console.log(e, /CHECKROLESERR/);
    } finally {
        return await addProperties(roles)
    }

    async function addProperties(roles) {
        for (let i = 0; i < roles.length; i++) {
            if (roles[i].type === "divider") continue;
            try {
                let colorRole = guild.roles.array().find(c => c.name.startsWith(roles[i].name));
                roles[i].id = colorRole.id;
            } catch(e) {
                console.log(e);
                continue;
            }
        }
        console.log(roles);
        return roles;
    }
}
