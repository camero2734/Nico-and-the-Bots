module.exports = {
    execute: function(msg){
        let toDecode = msg.removeCommand(msg.content)
        let output = morse.decode(toDecode.replace(/\n/g, " / "))
        if (output.length < 1 || output === "" || output === " ") output = morse.encode(toDecode)
        msg.channel.embed(output.toUpperCase()).catch(e => {})
    },
    info: {
        aliases: false,
        example: "!morse -. --.",
        minarg: 2,
        description: "DECODES MORSE BEEP BOOP",
        category: "Other",
    }
}