module.exports = {
    execute: function(msg) {
        
        if (msg.member.roles.get("330877657132564480")) checkNSFW(msg, true, nsfai);
        else {msg.delete(); msg.channel.embed("Only staff can use this command.")}
    }, info: {
        aliases: false,
        example: "!nsfw [Attach image or url]",
        minarg: 0,
        description: "Sees if an image is NSFW or not",
        category: "Staff",
    }
}