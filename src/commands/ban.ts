import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import { MessageTools } from "helpers";

export default new Command({
    name: "ban",
    aliases: ["bonk"],
    description: "Bans a user",
    category: "Staff",
    usage: "!ban [@ user]",
    example: "!ban @poot",
    async cmd(msg: CommandMessage): Promise<void> {
        const banMessage = msg.argsString.replace(/<@!{0,1}\d+>/g, "").trim();

        const mention = MessageTools.getMentionedUser(msg);
        const userID = mention?.id || msg.content.match(/\d{17,19}/)?.[0];

        if (!userID) throw new CommandError("Could not find the member to ban");

        // Ensure user isn't already banned
        const prevBan = await msg.guild?.fetchBan(userID).catch(() => null);
        if (prevBan) {
            const bannerID = prevBan.reason?.match(/\d{17,19}$/)?.[0];
            throw new CommandError(`<@${userID}> was already banned by <@${bannerID}>`);
        }

        const member = await msg.guild?.members.fetch(userID);
        if (!member || !msg.member) throw new CommandError("Could not find the member to ban");

        // Ensure mod isn't banning another mod (incl. themselves)
        if (member.roles.highest.comparePositionTo(msg.member.roles.highest) >= 0) {
            throw new CommandError("You cannot ban someone of equal or higher role");
        }

        // Try dm'ing ban reason
        try {
            const dm = await member.createDM();
            await dm.send(
                new MessageEmbed()
                    .setTitle("You have been banned from the twenty one pilots discord.")
                    .setColor("RANDOM")
                    .addField("Reason", banMessage === "" ? "No reason provided" : banMessage)
                    .addField("Timestamp", new Date().toString())
                    .addField("Appeal", "[Click Here to Appeal](https://www.discordclique.com/appeals)")
            );
        } catch (e) {
            console.log(e, /DM BAN ERROR/);
            await msg.channel.send(MessageTools.textEmbed("Unable to DM member before banning"));
        }

        // Ban member
        await member.ban({ reason: `${msg.author.username} ${msg.author.id}` });
        await msg.channel.send(MessageTools.textEmbed(`${member.displayName} (${member.id}) banned successfully`));
    }
});
