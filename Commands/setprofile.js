module.exports = {
    execute: function (msg) {
        if (msg.content.indexOf('$I/') === -1) return msg.channel.send('**Please see http://www.profilecreator.weebly.com to use this command**')
        let stuff = msg.removeCommand(msg.content)
        let array = stuff.split('$I/')
        array.shift()
        //TODO: Load JSON file, see if user exists, create their object. Yeehaw.
        for (let j = 0; j < array.length - 1; j++) {
            array[j] = array[j].replace(/\|\|/g, "\n")
            if (array[j].length > 40) {
                return msg.channel.send('`You passed the 40 character limit for a section! Note that this does not apply to the About Me section`')
            }
        }
        if (!profiles[msg.author.id]) profiles[msg.author.id] = {}
        profiles[msg.author.id]['name'] = array[0]
        profiles[msg.author.id]['song'] = array[1]
        profiles[msg.author.id]['album'] = array[2]
        profiles[msg.author.id]['band'] = array[3]
        profiles[msg.author.id]['genre'] = array[4]
        profiles[msg.author.id]['twitter'] = array[5]
        profiles[msg.author.id]['ig'] = array[6]
        profiles[msg.author.id]['steam'] = array[7]
        profiles[msg.author.id]['reddit'] = array[8]
        profiles[msg.author.id]['about'] = array[9]
        fs.writeFile("./json/profiles.json", JSON.stringify(profiles), (err) => {
            if (err) console.error(err)
        })
        msg.channel.send('`Your profile has been updated!`')
    },
    info: {
        aliases: false,
        example: "!profile",
        minarg: 0,
        description: "Allows you to create a profile via a website. Note: Mostly deprecated, use !createprofile instead.",
        category: "Profile",
    }
}