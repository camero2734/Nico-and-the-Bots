module.exports = {
    execute: async function(msg){
        var escaper = require("true-html-escape");
        const translate = require('translate');
        const token = require('google-translate-token');
        translate.engine = 'google';
        translate.key = process.env.GKEY;
        msg.channel.send(new Discord.RichEmbed({description: "Translating a bunch of times..."}).setColor("RANDOM").setFooter(msg.member.displayName, msg.author.displayAvatarURL)).then(async (m) => {
            let toConvert = msg.removeCommand(msg.content)
            let languages = ['es', 'af', 'nl', 'gl', 'ka', 'en']
            for (let language of languages) {
                await new Promise(async next => {
                    try {
                        toConvert = (await translate(toConvert, {to: language, from: languages[languages.indexOf(language)-1]}))
                    } catch(e) {
                        if (e) msg.channel.embed("This command is currently rate-limited.")
                    }
                    
                    next();
                })
            }
            m.edit(new Discord.RichEmbed({description: escaper.unescape(toConvert)}).setColor("RANDOM").setFooter(msg.member.displayName, msg.author.displayAvatarURL))
        })
        
    }
,
    info: {
        aliases: false,
        example: "!obfuscate [Text to mess up]",
        minarg: 2,
        description: "Puts text through a bunch of Google Translate languages and outputs something bad",
        category: "Fun",
    }
}