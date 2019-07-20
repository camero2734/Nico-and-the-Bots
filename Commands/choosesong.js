module.exports = {
    execute: async function (msg, args) {
        let allroles = chans.songroles;
        allroles.sort((a,b) => {
            let one = msg.guild.roles.get(a).name;
            let two = msg.guild.roles.get(b).name;
            return one < two ? -1 : 1;
        });
        for (let role of allroles) console.log(msg.guild.roles.get(role).name);

        let row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
        if (!row || !row.data) {
            await convertRoles()
            row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
        }
        let songrolesPre = row.data.split(",")
        let songroles = []
        for (let song of songrolesPre) {
            if (allroles.indexOf(song) !== -1) songroles[allroles.indexOf(song)] = song
        }
        for (let i = 0; i < songroles.length; i++) {
            if (typeof songroles[i] === "undefined") songroles.splice(i, 1)
        }
        if (songroles.length < 1) {
            convertRoles()
        }

        async function convertRoles(noReply) {
            return new Promise(finish => {
                (async function () {
                    for (let i = 0; i <= allroles.length; i++) {
                        let song = allroles[i]
                        if (i === allroles.length) {
                            let checkR = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
                            if (checkR && checkR.data && checkR.data.length > 0) {
                                if (!noReply) msg.channel.send("Added your roles!")
                            }
                            else if (!noReply) return msg.channel.send(`You do not have any song roles! Visit <#${chans.shop}> to buy one.`)
                        } else await (new Promise(next => {
                            if (msg.member.roles.get(song)) {
                                (async function () {
                                    let row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
                                    if (!row) {
                                        await sql.run("INSERT INTO songroles (id, data) VALUES (?, ?)", [msg.author.id, ""])
                                        row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
                                    }
                                    let curSongs = row.data.split(",")
                                    if (curSongs.indexOf(song) === -1) curSongs.push(song)
                                    let newData = curSongs.join(",")
                                    await sql.run(`UPDATE songroles SET data="${newData}" WHERE id="${msg.author.id}"`)
                                    msg.member.removeRole(song).then(() => next())
                                })()

                            } else next()
                        }))

                    }
                    finish()
                })()
            })

        }

        if (!args[1]) {
            convertRoles(true)
            let available = ""
            for (let song of songroles) {
                if (msg.guild.roles.get(song) && !msg.guild.roles.get(song).name.startsWith("Level")) {
                    available += msg.guild.roles.get(song).toString() + '\n'
                }
            }
            let embed = new Discord.RichEmbed({ title: "Your roles", description: available })
            embed.setColor('#' + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6))
            msg.channel.send({ embed: embed })
        } else {
            if (/[0-9]{18}/.test(args[1])) {
                let songid = args[1]
                if (allroles.indexOf(songid) === -1) return msg.channel.embed("Invalid song role! Use `!choosesong` by itself to see your song roles!")
                if (songroles.indexOf(songid) === -1) return msg.channel.embed("You don't have this role! Use `!choosesong` by itself to see your song roles!")
                changeRole(songid)
            } else {
                let songname = msg.removeCommand(msg.content).toLowerCase()
                let isInAll = false;
                for (let song of allroles) {
                    if (msg.guild.roles.get(song).name.toLowerCase() === songname) isInAll = true;
                }
                if (!isInAll) return msg.channel.embed("Invalid song role! Use `!choosesong` by itself to see your song roles!")
                let hasSong = false;
                let songid;
                for (let song of songroles) {
                    if (msg.guild.roles.get(song) && msg.guild.roles.get(song).name.toLowerCase() === songname) { hasSong = true; songid = song }
                }
                if (!hasSong) return msg.channel.embed("You don't have this role! Use `!choosesong` by itself to see your song roles!")
                changeRole(songid)
            }
        }
        async function changeRole(id) {
            for (let song of allroles) {
                await (new Promise(next => {
                    if (msg.member.roles.get(song)) {
                        (async function () {
                            let row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
                            if (!row) {
                                await sql.run("INSERT INTO songroles (id, data) VALUES (?, ?)", [msg.author.id, ""])
                                row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`)
                            }
                            let curSongs = row.data.split(",")
                            if (curSongs.indexOf(song) === -1) {
                                curSongs.push(song)
                                let newData = curSongs.join(",")
                                await sql.run(`UPDATE songroles SET data="${newData}" WHERE id="${msg.author.id}"`)
                            }
                            msg.member.removeRole(song)
                            next()
                        })()

                    } else next()
                }))

            }
            if (!msg.member.roles.get(id)) {
                setTimeout(() => { msg.member.addRole(id) }, 5000)
                msg.channel.embed("You now have the " + msg.guild.roles.get(id).name + " role activated!")
            } else {
                msg.channel.embed("You no longer have a song role!")
            }

        }
    },
    info: {
        aliases: ["choosesong","mysongs","changesong"],
        example: "!choosesong [Song role name or id]",
        minarg: 0,
        description: "Chooses a song role out of the ones you own",
        category: "Roles",
    }
}