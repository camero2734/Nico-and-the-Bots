module.exports = {
    execute: function (msg, args) {
        if (msg.author.id !== poot) return msg.channel.embed('Only pootus can doodus')
        let perk = args[1]
        if (!msg.mentions || !msg.mentions.users) return this.embed(msg)
        let id = msg.mentions.users.first().id
        sql.run(`UPDATE perks SET ${perk} ="${1}" WHERE userid ="${id}"`)
        msg.channel.embed("Successfully updated the " + perk + " perk for " + msg.mentions.users.first().username)
    },
    info: {
        aliases: false,
        example: "!giveperk [doubledaily, blurryboxinc, lvlcred] @user",
        minarg: 0,
        description: "Gives a user a perk",
        category: "Staff",
    }
}