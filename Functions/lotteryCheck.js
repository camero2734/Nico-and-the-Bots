module.exports = function(guild) {
    const storage = require("node-persist");
    const shuffle = require("./shuffle");
    const fs = require("fs");
    const chans = JSON.parse(fs.readFileSync("channels.json"));
    const bot = guild.client;
    check();
    setInterval(async () => {check();}, 10000);

    async function check() {
        let lot_time = await storage.getItem("_time");
        if (!lot_time) return;
        if (parseInt(lot_time) + 1000*3600*24 <= Date.now()) {
            console.log(/LOTTERY SHOULD END/);
            let entries = await storage.entries();
            function pickWinner() {
                shuffle(entries);
                if (!bot.guilds.get("269657133673349120").members.get(entries[0])) pickWinner();
            }
            pickWinner();
            let winnings = 10*Math.floor((564.8148*entries.length + (2318.95205953/entries.length) + 1712.9629)/ 10);
            bot.guilds.get("269657133673349120").channels.get(chans.commands).send(`**<@${entries[0]}> is the lottery winner!** They won ${winnings} credits.\n\nThe next lottery will start when at least two people have entered and will last 24 hours.`);

            let userEconomy = await connection.getRepository(Economy).findOne({ id: entries[0] });
            userEconomy.credits+=winnings;
            await connection.manager.save(userEconomy);
            await storage.removeItem("_time");
            for (let entry of entries) await storage.removeItem(entry);
        }
    }
};