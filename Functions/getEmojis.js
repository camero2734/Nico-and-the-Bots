module.exports = function () {
    let serverEmoji_regex = new RegExp(":[0-9]{18}(?=>)", "g")
    let serverEmojis = (this.content.match(serverEmoji_regex)) ? (this.content.match(serverEmoji_regex)).map(e => e.substring(1)) : []
    let standardEmojis = getUnicodeEmojis(this.content)
    let combinedEmojis = serverEmojis.concat(standardEmojis)
    let sortedEmojis = []
    for (let emoji of combinedEmojis) {
        sortedEmojis.push({ emoji: emoji, index: this.content.indexOf(emoji) })
    }
    sortedEmojis.sort((a, b) => {
        return (a.index > b.index)
    })
    return sortedEmojis

    function getUnicodeEmojis(string) {
        string = string.replace(/[A-z0-9\t\n./<>?;:"'`!@#$%^&*()\[\]{}_+=|\\-]/g, "")
        let emojis = []
        let dontadd = false
        let nospaces = string.replace(/ /g, "")
        let characters = string.replace(/[ ]{2,}/g, " ").split("")
        for (let i = 0; i < nospaces.length; i += 2) {
            if (dontadd) {
                dontadd = false
            } else {
                let regional_indicators = ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯", "🇰", "🇱", "🇲", "🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹", "🇺", "🇻", "🇼", "🇽", "🇾", "🇿"]
                let emoji = nospaces.charAt(i) + nospaces.charAt(i + 1)
                let nextemoji = nospaces.charAt(i + 2) + nospaces.charAt(i + 3)
                let hasspace = characters[characters.indexOf(nospaces.charAt(i + 1)) + 1] === ' '
                if (!hasspace && regional_indicators.indexOf(emoji) !== -1 && regional_indicators.indexOf(nextemoji) !== -1) { emoji += nextemoji; dontadd = true }
                emojis.push(emoji)
                characters.splice(0, characters.indexOf(nospaces.charAt(i + 1)) + (dontadd ? 3 : 1))
            }

        }
        return emojis
    }
}