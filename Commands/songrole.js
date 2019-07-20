module.exports = {
    execute: async function (msg, args) {
        if (msg.author.id !== poot) return;
        let songrole = args[1]
        let row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
        if (!row) {
            await sql.run("INSERT INTO songroles (id, data) VALUES (?, ?)", [msg.author.id, ""])
            row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
        }
        let curSongs = row.data.split(",")
        curSongs.push(songrole)
        let newData = curSongs.join(",")
        await sql.run(`UPDATE songroles SET data="${newData}" WHERE id="${msg.author.id}"`)
        let added = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
    },
    info: {
        aliases: false,
        example: "!songrole",
        minarg: 0,
        description: "under construction",
        category: "Staff",
    }
}