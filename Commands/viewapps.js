module.exports = {
    execute: function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("No. You do not possess this power.");
        const fs = require('fs');
        const readline = require('readline');
        const { google } = require('googleapis');

        const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
        const TOKEN_PATH = 'token.json';

        // Load client secrets from a local file.
        fs.readFile('./json/credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            authorize(JSON.parse(content), getCells);
        });

        /**
         * Create an OAuth2 client with the given credentials, and then execute the
         * given callback function.
         * @param {Object} credentials The authorization client credentials.
         * @param {function} callback The callback to call with the authorized client.
         */
        function authorize(credentials, callback) {
            const { client_secret, client_id, redirect_uris } = credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(
                client_id, client_secret, redirect_uris[0]);

            // Check if we have previously stored a token.
            fs.readFile(TOKEN_PATH, (err, token) => {
                if (err) return getNewToken(oAuth2Client, callback);
                oAuth2Client.setCredentials(JSON.parse(token));
                callback(oAuth2Client);
            });
        }

        /**
         * Get and store new token after prompting for user authorization, and then
         * execute the given callback with the authorized OAuth2 client.
         * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
         * @param {getEventsCallback} callback The callback for the authorized client.
         */
        function getNewToken(oAuth2Client, callback) {
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
            });
            console.log('Authorize this app by visiting this url:', authUrl);
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            rl.question('Enter the code from that page here: ', (code) => {
                rl.close();
                oAuth2Client.getToken(code, (err, token) => {
                    if (err) return console.error('Error while trying to retrieve access token', err);
                    oAuth2Client.setCredentials(token);
                    // Store the token to disk for later program executions
                    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                        if (err) return console.error(err);
                        console.log('Token stored to', TOKEN_PATH);
                    });
                    callback(oAuth2Client);
                });
            });
        }


        async function getCells(auth) {
            const sheets = google.sheets({ version: 'v4', auth });
            sheets.spreadsheets.values.get({
                spreadsheetId: '1GwAzY8qmPu5J_IW35_p0LYWqhnf1_e3NmBY85bv2L-4',
                range: 'A:R',
            }, async (err, res) => {
                if (err) {
                    msg.channel.embed("Error");
                    return console.log('The API returned an error: ' + err);
                }
                const apps = res.data.values;
                let input = msg.removeCommand();
                if (/\d{18}/.test(input)) {
                    let id = input.match(/\d{18}/)[0];
                    let member = await msg.guild.members.get(id);
                    if (!member) return msg.channel.embed("This appears to have been a mention or user id, but the user was not found.");
                    let fullNameDiscriminator = member.user.username + "#" +  member.user.discriminator;
                    msg.channel.embed(fullNameDiscriminator)
                    for (let app of apps) {
                        if(app[1].toLowerCase() === fullNameDiscriminator.toLowerCase()) return sendAppEmbed(app, apps[0]);
                    }
                    return msg.channel.embed("This member has not submitted an app, or has submitted an app with their username in an improper format. Please type in their name as it appears in the spreadsheet directly.");
                } else if (/^[\d]*$/.test(input)) {
                    if (input < 1 || input > apps.length) return msg.channel.embed("Invalid application number. There are " + apps.length + " current applications.")
                    return sendAppEmbed(apps[input], apps[0]);
                } else {
                    let i = 0;
                    for (let app of apps) {
                        if (i++ === 0) continue;
                        let a = app[1].toLowerCase();
                        let b = input.toLowerCase();
                        if(a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return sendAppEmbed(app, apps[0]);
                    }
                    return msg.channel.embed("No user found matching or containing this name.");
                }
            });
        }

        async function sendAppEmbed(row, titles) {
            let embed = new Discord.RichEmbed().setColor("RANDOM");
            embed.setTitle(row[1]);
            embed.setFooter("Submitted at " + row[0]);
            row.shift(); row.shift(); titles.shift(); titles.shift();
            for (let i = 0; i < row.length; i++) {
                embed.addField(titles[i], row[i] === "" ? "No input" : row[i].substring(0, 1023));
            }
            msg.channel.send(embed);
        }
    },
    info: {
        aliases: ["viewapps", "va", "modapp", "viewapp"],
        example: "!viewapps (app # or mention or username)",
        minarg: 0,
        description: "Sends mod app with # provided",
        category: "Music",
    }
}