module.exports = {
    execute: function (msg) {
        const got = require("got")
        const place = removeCommand(msg.content).split(" ").join("_")
        const url = 'https://time.is/?q=+' + place;
        got(url).then(res => {
            const base = res.body;
            const timeArgs = base.split('<div id="twd">')[1].split('</div>')[0].split(`<span id="ampm" style="font-size:21px;line-height:21px">`);
            const time = timeArgs[0] + " " + timeArgs[1].split("</span>")[0]
            msg.channel.embed("It is currently **" + time + "** in " + place);
        }).catch(err => {
            msg.channel.embed("Invalid location.")
        });
    },
    info: {
        aliases: false,
        example: "!timein Chicago, Illinois",
        minarg: 2,
        description: "Searches for and displays the time in a certain area",
        category: "Other",
    }
}