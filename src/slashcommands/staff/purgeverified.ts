import { channelIDs, roles, userIDs } from "../../configuration/config";
import { CommandOptions, CommandRunner } from "../../configuration/definitions";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { ComponentActionRow } from "slash-create";

export const Options: CommandOptions = {
    description: "Removes all users from verified-theories and DMs them",
    options: []
};

export const Executor: CommandRunner<{
    amount: number;
}> = async (ctx) => {
    await ctx.defer();
    const dmEmbed = new MessageEmbed()
        .setTitle("The Verified Theories role has been purged")
        .setDescription(
            `You are receiving this message because you had the \`verified-theories\` role. The questions have been updated with new content and so we feel it fair to have everyone reapply in order to guarantee the discussion is informed as possible. More information is available in the channel.\n\nThe command to reapply is a **slash command**, which is \`/apply verifiedtheories\`. This command will be available in about 15 minutes. Type this into <#${channelIDs.commands}> as you normally would. There are now **15** questions and (just like before) you must answer them *all* correctly in order to pass.`
        )
        .setFooter("bye bye veribesties");

    const actionRow = (<unknown>(
        new MessageActionRow().addComponents([
            new MessageButton({ label: "Purge role", style: "DANGER", customId: "purgeverified" })
        ])
    )) as ComponentActionRow;

    await ctx.send({
        content: `> The following embed will be sent to all members and the role will be cleared. Only <@${userIDs.me}> can click the purge button.\n\n.`,
        embeds: [dmEmbed.toJSON()],
        components: [actionRow]
    });

    ctx.registerComponent("purgeverified", async (btnCtx) => {
        if (btnCtx.user.id !== userIDs.me) return;

        await ctx.editOriginal({
            content: "Fetching members with role (this will take a while)...",
            components: [],
            embeds: []
        });

        const allMembers = await ctx.member.guild.members.fetch();
        const role = await ctx.member.guild.roles.fetch(roles.verifiedtheories);
        if (!role) return;

        const members = allMembers.filter((m) => m.roles.cache.has(role.id)).array();

        await ctx.editOriginal({ content: `Fetched ${members.length} members. Removing roles and DM'ing...` });

        const unableToSendTo: string[] = [];

        let i = 1;
        for (const m of members) {
            try {
                const dm = await m.createDM();
                await dm.send({ embeds: [dmEmbed] });
                await m.roles.remove(roles.verifiedtheories);
                if (i % 5 === 0) {
                    await ctx.editOriginal({
                        content: `Fetched ${members.length} members. Removing roles and DM'ing...(${i}/${members.length})`,
                        allowedMentions: { users: [], everyone: false }
                    });
                }
                i++;
            } catch (e) {
                unableToSendTo.push(`${m}`);
            }
        }

        await ctx.channel.send(
            `Purged verified theories role. Sent to ${
                members.length - unableToSendTo.length
            } members, failed to send/remove role from ${unableToSendTo.length} members\n${unableToSendTo.join(" ")}`
        );
    });
};
