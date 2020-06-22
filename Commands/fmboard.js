module.exports = {
    execute: async function (msg) {
        return msg.channel.embed("This command is disabled");
        const { loadImage, createCanvas, registerFont } =  Canvas;

        let subcommands = [
            {
                command: "ptracks",
                description: "The tracks that have been !fm'd the most",
                execute: getMostPlayedTracks
            },
            {
                command: "palbums",
                description: "The albums that have been !fm'd the most",
                execute: getMostPlayedAlbums
            },
            {
                command: "partists",
                description: "The artists that have been !fm'd the most",
                execute: getMostPlayedArtists
            },

            {
                command: "stracks",
                description: "The tracks that have received the most stars",
                execute: getMostStarredTracks
            },
            {
                command: "salbums",
                description: "The albums that have received the most stars",
                execute: getMostStarredAlbums
            },
            {
                command: "sartists",
                description: "The artists that have received the most stars",
                execute: getMostStarredArtists
            },

            {
                command: "atracks",
                description: "The tracks that have received the most stars **on average**",
                execute: getAvgStarredTracks
            },
            {
                command: "aalbums",
                description: "The albums that have received the most stars **on average**",
                execute: getAvgStarredAlbums
            },
            {
                command: "aartists",
                description: "The artists that have received the most stars **on average**",
                execute: getAvgStarredArtists
            },
            {
                command: "susers",
                description: "The users that have received the most stars",
                execute: getMostStarredUsers
            },
            {
                command: "ausers",
                description: "The users that have received the most stars **on average**",
                execute: getAvgStarredUsers
            },
        ]

        let args = msg.content.split(" ");
        if (args.length === 1 || !subcommands.some(s => s.command === args[1].trim().toLowerCase())) {
            // Send list of subcommands
            let embed = new Discord.RichEmbed()
                .setTitle("Available Subcommands")
                .setFooter("Use subcommand by saying: !fmboard [subcommand]\nEx: !fmboard ptracks");

            for (let s of subcommands) {
                embed.addField(s.command, s.description, true);
            }

            return msg.channel.send(embed);
        } else {
            let subcommand = subcommands.find(s => s.command === args[1].trim().toLowerCase());
            let results = await subcommand.execute();

            console.log(results, /RESULTS/);

            // TODO: delete
            // results = results.concat(results).concat(results);

            let page = args.length > 2 && !isNaN(args[2]) && args[2] > 0 ? args[2] - 1 : 0;
            if (results.length < 10 * page) return msg.channel.embed("This page does not exist");
            let selectedResults = results.slice(10 * page, 10 * (page + 1));

            let canvas = createCanvas(1500, 2200);
            let ctx = canvas.getContext("2d");
            let fontDec = subcommand.command.indexOf("users") === -1 ? 10 : 0;

            registerFonts();

            ctx.font = "100px futura";
            ctx.textAlign = "center";
            ctx.fillStyle = "#EEEEEE";
            ctx.fillRect(0, 0, 1500, 2200);

            ctx.fillStyle = "#FF0000";
            ctx.strokeStyle = "#FF0000";
            ctx.lineWidth = 10;
            ctx.fillText(subcommand.command.toUpperCase(), 750, 120);
            ctx.fillText("_______________", 750, 125);

            for (let i = 0; i < selectedResults.length; i++) {
                let [bigText, littleText, getImageURL] = selectedResults[i];
                let img = await loadImage(await getImageURL());

                let index = i + 1 + page * 10;

                // Rank #
                ctx.font = "80px futura";
                ctx.fillStyle = "#FF0000";
                ctx.textAlign = "right";
                ctx.fillText(index, 125, 200 * (i + 1) + 115);

                // Image and border
                ctx.drawImage(img, 150, 200 * (i + 1), 150, 150);
                ctx.strokeRect(150, 200 * (i + 1), 150, 150);

                // bigText
                ctx.textAlign = "left";
                ctx.font = `${70 - fontDec}px futura`;
                ctx.fillText(bigText, 350, 200 * (i + 1) + 50);

                // littleText
                ctx.font = `${50 - fontDec}px futura`;
                ctx.fillStyle = "#000000";
                ctx.fillText(littleText, 350, 200 * (i + 1) + 125);
            }

            let leaderboard = new Discord.Attachment(canvas.toBuffer(), "leaderboard.png");
            return msg.channel.send(leaderboard);
        }



        // MOST PLAYED
        async function getMostPlayedTracks() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.track AS "Title"`, `fm.album AS "Album"`, `fm.artist AS "Artist"`, `COUNT(fm.message_id) AS "Count"`])
                .groupBy([`fm.track`, `fm.album`, `fm.artist`])
                .orderBy("Count", "DESC")
                .getRawMany();

            for (let i in results) {
                let r = results[i];
                let rNew = [r.Title + " - " + r.Artist, '❌' + r.Count];
                rNew.push(async () => {
                    let imageURL = "./images/artist.png";
                    try {
                        let reqURL = `http://ws.audioscrobbler.com/2.0/?method=album.getInfo&artist=${r.Artist}&album=${r.Album}&autocorrect=1&api_key=${process.env.LASTFM}&format=json`;
                        let req = await nodefetch(reqURL);
                        let json = await req.json();
                        imageURL = json.album.image[2]["#text"];
                    }
                    finally {
                        return imageURL;
                    }
                });
                results[i] = rNew;
            }
            return results;
        }

        async function getMostPlayedAlbums() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.album AS "Album"`, `fm.artist AS "Artist"`, `COUNT(fm.stars) AS "Count"`])
                .groupBy([`fm.album`, `fm.artist`])
                .orderBy("Count", "DESC")
                .getRawMany();

            for (let i in results) {
                let r = results[i];
                let rNew = [r.Album + " - " + r.Artist, '❌' + r.Count];
                rNew.push(async () => {
                    let imageURL = "./images/artist.png";
                    try {
                        let reqURL = `http://ws.audioscrobbler.com/2.0/?method=album.getInfo&artist=${r.Artist}&album=${r.Album}&autocorrect=1&api_key=${process.env.LASTFM}&format=json`;
                        let req = await nodefetch(reqURL);
                        let json = await req.json();
                        imageURL = json.album.image[2]["#text"];
                    }
                    finally {
                        return imageURL;
                    }
                });
                results[i] = rNew;
            }
            return results;
        }

        async function getMostPlayedArtists() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.artist AS "Artist"`, `COUNT(fm.stars) AS "Count"`])
                .groupBy([`fm.artist`])
                .orderBy("Count", "DESC")
                .getRawMany();

            for (let i in results) {
                let r = results[i];
                let rNew = [r.Artist, '❌' + r.Count];
                rNew.push(async () => {
                    let imageURL = "./images/artist.png";
                    try {
                        let reqURL = `http://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${r.Artist}&autocorrect=1&api_key=${process.env.LASTFM}&format=json`;
                        let req = await nodefetch(reqURL);
                        let json = await req.json();
                        imageURL = json.topalbums.album[0].image[2]["#text"];
                    }
                    finally {
                        return imageURL;
                    }
                });
                results[i] = rNew;
            }
            return results;
        }


        // MOST STARRED
        async function getMostStarredTracks() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.track AS "Title"`, `fm.album AS "Album"`, `fm.artist AS "Artist"`, `SUM(fm.stars) AS "Stars"`])
                .groupBy([`fm.track`, `fm.album`, `fm.artist`])
                .orderBy("Stars", "DESC")
                .getRawMany();

            for (let i in results) {
                let r = results[i];
                let rNew = [r.Title + " - " + r.Artist, r.Stars.toFixed(2) + '⭐'];
                rNew.push(async () => {
                    let imageURL = "./images/artist.png";
                    try {
                        let reqURL = `http://ws.audioscrobbler.com/2.0/?method=album.getInfo&artist=${r.Artist}&album=${r.Album}&autocorrect=1&api_key=${process.env.LASTFM}&format=json`;
                        let req = await nodefetch(reqURL);
                        let json = await req.json();
                        imageURL = json.album.image[2]["#text"];
                    }
                    finally {
                        return imageURL;
                    }
                });
                results[i] = rNew;
            }
            return results;
        }

        async function getMostStarredAlbums() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.album AS "Album"`, `fm.artist AS "Artist"`, `SUM(fm.stars) AS "Stars"`])
                .groupBy([`fm.album`, `fm.artist`])
                .orderBy("Stars", "DESC")
                .getRawMany();

            for (let i in results) {
                let r = results[i];
                let rNew = [r.Album + " - " + r.Artist, r.Stars.toFixed(2) + '⭐'];
                rNew.push(async () => {
                    let imageURL = "./images/artist.png";
                    try {
                        let reqURL = `http://ws.audioscrobbler.com/2.0/?method=album.getInfo&artist=${r.Artist}&album=${r.Album}&autocorrect=1&api_key=${process.env.LASTFM}&format=json`;
                        let req = await nodefetch(reqURL);
                        let json = await req.json();
                        imageURL = json.album.image[2]["#text"];
                    }
                    finally {
                        return imageURL;
                    }
                });
                results[i] = rNew;
            }
            return results;
        }

        async function getMostStarredArtists() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.artist AS "Artist"`, `SUM(fm.stars) AS "Stars"`])
                .groupBy([`fm.artist`])
                .orderBy("Stars", "DESC")
                .getRawMany();

            for (let i in results) {
                let r = results[i];
                let rNew = [r.Artist, r.Stars.toFixed(2) + '⭐'];
                rNew.push(async () => {
                    let imageURL = "./images/artist.png";
                    try {
                        let reqURL = `http://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${r.Artist}&autocorrect=1&api_key=${process.env.LASTFM}&format=json`;
                        let req = await nodefetch(reqURL);
                        let json = await req.json();
                        imageURL = json.topalbums.album[0].image[2]["#text"];
                    }
                    finally {
                        return imageURL;
                    }
                });
                results[i] = rNew;
            }
            return results;
        }


        // MOST STARRED ON AVERAGE
        async function getAvgStarredTracks() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.track AS "Title"`, `fm.album AS "Album"`, `fm.artist AS "Artist"`, `AVG(fm.stars) AS "Stars"`])
                .where(`fm.stars > 0`)
                .groupBy([`fm.track`, `fm.album`, `fm.artist`])
                .orderBy("Stars", "DESC")
                .getRawMany();

            for (let i in results) {
                let r = results[i];
                let rNew = [r.Title + " - " + r.Artist, r.Stars.toFixed(2) + '⭐'];
                rNew.push(async () => {
                    let imageURL = "./images/artist.png";
                    try {
                        let reqURL = `http://ws.audioscrobbler.com/2.0/?method=album.getInfo&artist=${r.Artist}&album=${r.Album}&autocorrect=1&api_key=${process.env.LASTFM}&format=json`;
                        let req = await nodefetch(reqURL);
                        let json = await req.json();
                        imageURL = json.album.image[2]["#text"];
                    }
                    finally {
                        return imageURL;
                    }
                });
                results[i] = rNew;
            }
            return results;
        }

        async function getAvgStarredAlbums() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.album AS "Album"`, `fm.artist AS "Artist"`, `AVG(fm.stars) AS "Stars"`])
                .where(`fm.stars > 0`)
                .groupBy([`fm.album`, `fm.artist`])
                .orderBy("Stars", "DESC")
                .getRawMany();

            for (let i in results) {
                let r = results[i];
                let rNew = [r.Album + " - " + r.Artist, r.Stars.toFixed(2) + '⭐'];
                rNew.push(async () => {
                    let imageURL = "./images/artist.png";
                    try {
                        let reqURL = `http://ws.audioscrobbler.com/2.0/?method=album.getInfo&artist=${r.Artist}&album=${r.Album}&autocorrect=1&api_key=${process.env.LASTFM}&format=json`;
                        let req = await nodefetch(reqURL);
                        let json = await req.json();
                        imageURL = json.album.image[2]["#text"];
                    }
                    finally {
                        return imageURL;
                    }
                });
                results[i] = rNew;
            }
            return results;
        }


        async function getAvgStarredArtists() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.artist AS "Artist"`, `AVG(fm.stars) AS "Stars"`])
                .where(`fm.stars > 0`)
                .groupBy([`fm.artist`])
                .orderBy("Stars", "DESC")
                .getRawMany();

            for (let i in results) {
                let r = results[i];
                let rNew = [r.Artist, r.Stars.toFixed(2) + '⭐'];
                rNew.push(async () => {
                    let imageURL = "./images/artist.png";
                    try {
                        let reqURL = `http://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${r.Artist}&autocorrect=1&api_key=${process.env.LASTFM}&format=json`;
                        let req = await nodefetch(reqURL);
                        let json = await req.json();
                        imageURL = json.topalbums.album[0].image[2]["#text"];
                    }
                    finally {
                        return imageURL;
                    }
                });
                results[i] = rNew;
            }
            return results;
        }

        // USERS
        async function getMostStarredUsers() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.id AS "user"`, `SUM(fm.stars) AS "Stars"`])
                .groupBy([`fm.id`])
                .orderBy("Stars", "DESC")
                .getRawMany();

            return results
                .filter(r => msg.guild.members.get(r.user))
                .map(r => [msg.guild.members.get(r.user).displayName, r.Stars.toFixed(2) + '⭐', () => msg.guild.members.get(r.user).user.displayAvatarURL]);
        }

        async function getAvgStarredUsers() {
            let results = await connection.getRepository(FM)
                .createQueryBuilder("fm")
                .select([`fm.id AS "user"`, `AVG(fm.stars) AS "Stars"`])
                .where(`fm.stars > 0`)
                .groupBy([`fm.id`])
                .orderBy("Stars", "DESC")
                .getRawMany();

            return results
                .filter(r => msg.guild.members.get(r.user))
                .map(r => [msg.guild.members.get(r.user).displayName, r.Stars.toFixed(2) + '⭐', () => msg.guild.members.get(r.user).user.displayAvatarURL]);
        }

        async function registerFonts() {
            registerFont(("./assets/fonts/h.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/f.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/NotoEmoji-Regular.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/a.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/j.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/c.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/br.ttf"), { family: "futura" });
        }
    },
    info: {
        aliases: ["fmboard", "fmtop", "fmleaderboard", "fmb"],
        example: "!fmboard",
        minarg: 0,
        description: "Displays a list of available subcommands to view FM results",
        category: "NA"
    }
}
