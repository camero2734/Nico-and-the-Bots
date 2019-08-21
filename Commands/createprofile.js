module.exports = {
    execute: function (msg) {
        msg.reply("Check your DM's to set up the profile!")
        msg.member.createDM().then((dm) => {
            dm.send('**Create your profile below!**\nFeel free to use emojis (most will work)\n\nAlso keep in mind that there is a __2 minute time-out window__ (per question). If there are any issues, please contact poot!\n\nPlease remember this is a public server so always think before posting personal social media accounts, your real name, etc.\n---')
        })
        if (!profiles[msg.author.id]) profiles[msg.author.id] = {}
        let arr = ['name', 'song', 'album', 'band', 'genre', 'twitter', 'ig', 'steam', 'reddit', 'about']
        let questions = ['What is your name? This can be your server name, a nickname, anything at all.', 'What is your favorite song?', 'What is your favorite album?', 'What is your favorite band?', 'What is your favorite genre of music?', 'What is your twitter handle?', 'What is your Instagram?', 'What is your Steam name?', 'What is your reddit u/?', 'Please add more details about yourself [About Me]\n`Remember that long answers need to be formatted with line breaks in order to properly fit in the text box`']
        async function askQuestions() {
            for (let i = 0; i < arr.length; i++) {
                await new Promise(next => {
                    msg.member.createDM().then((dm) => {
                        dm.send("`(" + (i + 1) + '/' + arr.length + ') ' + questions[i] + "`").then(() => {
                            const filter = m => !m.author.bot
                            dm.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] })
                                .then(collected => {
                                    let answer = collected.first()
                                    profiles[msg.author.id][arr[i]] = answer.content
                                    if (i !== arr.length - 1) {
                                        next()
                                    } else {
                                        dm.send('Thank you! Use `!profile` in #commands to see the results.')
                                        fs.writeFile("./profiles.json", JSON.stringify(profiles), (err) => {
                                            if (err) console.error(err)
                                        })
                                    }
                                })
                                .catch(collected => dm.send(`Your request has timed out. Please use !createprofile in #commands to restart!`));

                        })
                    })


                })
            }
        }
        askQuestions()
    },
    info: {
        aliases: false,
        example: "!createprofile",
        minarg: 0,
        description: "Create your profile via DMs.",
        category: "Profile",
    }
}