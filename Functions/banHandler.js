module.exports = async function (guild, user, info) {
    console.log("Handling ban");
    let {chan, Discord, banned} = info;
    let banlog = guild.channels.get(chan);

    // Try to find out who banned the person
    let executor = null;
    try {
        let auditFetched = await guild.fetchAuditLogs({ type: banned ? "MEMBER_BAN_ADD" : "MEMBER_BAN_REMOVE" });
        let audit = auditFetched.entries.first();
        console.log(audit.targetType, audit.target.id, user.id, /TYPE-TARGET-USER/);
        if (audit.targetType !== "USER" || audit.target.id !== user.id) throw new Error("No ban audit log entry found for this user");

        executor = audit.executor;
        if (executor.bot) executor = guild.members.get(audit.reason.split(" ")[1]).user;

    } catch(e) {
        console.log(e, /BANHANDLE_ERR/);
    }

    console.log("About to send ban");
    await banlog.send(
        new Discord.RichEmbed()
            .setTitle(`${user.username} was ${banned ? "banned" : "unbanned"}`)
            .setThumbnail(user.displayAvatarURL)
            .addField(`${banned ? "Banned" : "Unbanned"} by`, `${executor ? `${executor.username}` : "Unknown"}`)
            .setFooter(`BannedID: ${user.id}${executor ? `\nBannerID: ${executor.id}` : ""}`, executor ? executor.displayAvatarURL : guild.client.user.displayAvatarURL)
    );
};
