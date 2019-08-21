module.exports = function(guild) {
    const TO = "278225702455738368";
    const storage = require("node-persist");
    const shuffle = require("./shuffle");
    const fs = require("fs");
    const chans = JSON.parse(fs.readFileSync("channels.json"));
    const bot = guild.client;
    setInterval(async () => {
        var guild = bot.guilds.get("269657133673349120");
        let reminders = await connection.getRepository(Item).find({ type: "Reminder", time: typeorm.LessThan(Date.now()) });
        for (let rem of reminders) {
            let mem = guild.members.get(rem.id);
            if (!mem) continue;
            try {
                let dm = await mem.createDM();
                await dm.send("REMINDER: You are being reminded that you said the following: **" + rem.title + "**");
            } catch(e) {
                console.log(e);
                console.log("Could not dm " + mem.displayName + " reminder");
            }
            
        }
        await connection.manager.remove(reminders);
        
        let timeouts = await connection.getRepository(Item).find({ type: "Timeout", time: typeorm.LessThan(Date.now()) });
        for (let to of timeouts) {
            let mem = guild.members.get(to.id);
            if (!mem) continue;
            await mem.removeRole(TO);
            await mem.addRole("269660541738418176"); //BANDITOS role
            try {
                let dm = await mem.createDM();
                await dm.send("You are no longer muted!");
            } catch(e) {
                console.log(e);
                console.log("Could not dm " + mem.displayName + " timeout");
            }
            
        }
        await connection.manager.remove(timeouts);
    }, 10000);
};