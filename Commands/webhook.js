module.exports = {
    execute: function (msg) {
        msg.delete()
        let channel = msg.guild.channels.get('470335358970757145')
        if (msg.author.id !== poot) return
        channel.fetchWebhooks().then(async webhooks => {
            let webhook = (webhooks.first() ? webhooks.first() : await channel.createWebhook('Semi Botomatic', 'https://i.imgur.com/rW0YyWd.png'))
            webhook.send("I've been wrong before though so it's just an idea.")
        })
    },
    info: {
        aliases: false,
        example: "!webhook",
        minarg: 0,
        description: "test",
        category: "Staff",
    }
}