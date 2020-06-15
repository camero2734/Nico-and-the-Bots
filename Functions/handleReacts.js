module.exports = async function(msg, autoreactJSON) {
    if (!autoreactJSON.hasOwnProperty(msg.channel.id)) return;

    for (let emoji in autoreactJSON[msg.channel.id]) {
        let { messages, images, embeds, users } = autoreactJSON[msg.channel.id][emoji];

        // Check users property
        if (Array.isArray(users) && users.indexOf(msg.author.id) === -1) continue;

        console.log("Valid user: " + emoji);

        let messageValid = false;
        // Check images property
        if (images && msg.attachments && msg.attachments.size > 0) messageValid = true, console.log("Valid image "  + emoji);

        // Check messages property
        if (messages && msg.content && msg.content.length > 0) messageValid = true, console.log("Valid message "  + emoji);

        // Check embeds property
        if (embeds && msg.embeds && msg.embeds.length > 0) messageValid = true, console.log("Valid embed "  + emoji);

        if (messageValid) await msg.react(emoji);
    }
}
