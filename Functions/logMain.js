module.exports = async function(msg) {
    let allowedChans = ["470330055063633920", "470330688235765770", "470330491816509449", "480934371126280202"]
    if (allowedChans.indexOf(msg.channel.id) === -1) return;
    
    const sql = require("sqlite");
    const oneWeek = 1000 * 3600 * 24 * 7;
    sql.open("./daily.sqlite")

    let row = await sql.get(`SELECT DISTINCT * FROM mainCount WHERE userId="${msg.author.id}"`);
    if (!row) {
        await sql.run("INSERT INTO mainCount (userId, count, dema) VALUES (?, ?, ?)", [msg.author.id, "", ""]);
        row = await sql.get(`SELECT DISTINCT * FROM mainCount WHERE userId="${msg.author.id}"`);
    }

    if (msg.channel.id === "480934371126280202") { //#dema-council
        let timesStr = "";
        if (row.dema) timesStr = row.dema;
        timesStr+=Date.now() + ",";
        let times = timesStr.split(".");
        for (let i = 0; i < times.length; i++) if (Date.now() - oneWeek >= times[i]) times.splice(i, 1);
        let count = times.join(",");
        if (times.length < 7 * 30) await sql.run(`UPDATE mainCount SET dema ="${count}" WHERE userId ="${msg.author.id}"`);
    } else {
        let timesStr = "";
        if (row.count) timesStr = row.count;
        timesStr+=Date.now() + ",";
        let times = timesStr.split(".");
        for (let i = 0; i < times.length; i++) if (Date.now() - oneWeek >= times[i]) times.splice(i, 1);
        let count = times.join(",");
        if (times.length < 7 * 30) await sql.run(`UPDATE mainCount SET count ="${count}" WHERE userId ="${msg.author.id}"`);
    }
    

    
}