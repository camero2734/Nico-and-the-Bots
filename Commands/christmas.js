module.exports = {
    execute: async function (msg) {
        try {
            
            let emojis = "🎄⛄🎁";
            let emojisR = "🎁⛄🎄";

            if (msg.member.nickname && msg.member.nickname.indexOf("🎄⛄🎁") !== -1 && msg.member.nickname.indexOf("🎁⛄🎄") !== -1) {
                let newName = msg.member.nickname.replace(/🎄⛄🎁|🎁⛄🎄/g, "")
                msg.member.setNickname(newName).then(() => {
                    msg.channel.embed("Your name was un-Christmas'd!")
                }).catch(e => {
                    msg.channel.embed(`Unable to change your nickname. Here's the un-Christmasy name to copy and paste:\n\`${newName}\``);
                })
            } else {
                let newName = emojis + msg.member.displayName + emojisR;
                msg.member.setNickname(newName).then(() => {
                    msg.channel.embed("Your name was Christmas'd!")
                }).catch(e => {
                    msg.channel.embed(`Unable to change your nickname. Here's the Christmasy name to copy and paste:\n\`${newName}\``);
                })
            }
        } catch(e) {
            console.log(e, /ERR/)
        }
        
    },
    info: {
        aliases: false,
        example: "!christmas",
        minarg: 0,
        description: "Checks warnings for a user",
        category: "Staff",
    }
}