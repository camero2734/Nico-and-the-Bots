module.exports = {
    execute: function (msg) {
        let page = msg.removeCommand(msg.content)
        if (!page) page = 1
        if (parseInt(page) / parseInt(page) !== 1 || parseInt(page) < 1) return msg.channel.send('```Proper command usage is !tagstop (page number)```')
        var array = []
        for (var key in tags) {
            if (tags.hasOwnProperty(key)) {
                var object = tags[key]
                var num = object.num
                var tag = object.tag
                var user = object.user
                var member = msg.guild.members.get(user)
                var tagname = key
                array.push({ tag: tag, num: num, member: member, tagname: tagname })
            }
        }
        array.sort(function (a, b) {
            return parseFloat(a.num) - parseFloat(b.num);
        });
        if ((k + 10 * (page - 1)) > array.length) return msg.channel.send('```Page does not exist!```')
        var k = 0
        var string = ''
        for (let i = array.length - (1 + 10 * (page - 1)); i >= 0; i--) {
            k++
            if (k <= 10) {
                string += (k + 10 * (page - 1)) + '. Tag: ' + array[i].tagname + '//Uses: ' + array[i].num + '\n'
            }
        }
        myFunctions.sendembed(msg, msg.channel, '__**Top Tags**__', string, 3115167, true)
    },
    info: {
        aliases: false,
        example: "!tagstop (page number)",
        minarg: 1,
        description: "Displays the most used !tag entries",
        category: "Tags",
    }
}