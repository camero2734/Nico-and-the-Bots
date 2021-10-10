import { Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { nanoid } from "nanoid";
import { roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { queries } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Opens an application to the Firebreathers role",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    if (ctx.user.id !== userIDs.me) throw new CommandError("This command is disabled");

    if (!ctx.member.roles.cache.has(roles.staff)) {
        throw new CommandError("This command is not available yet.");
    }

    const applicationId = nanoid(); // TODO: should be uuid primary key in DB

    const link = `https://docs.google.com/forms/d/e/1FAIpQLSdhs01W8sAJTzp-lZNC0G2exKmNK1IcNsLtZuf5W-Zww_-p3w/viewform?usp=pp_url&entry.775451243=${applicationId}`;

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.member.displayAvatarURL())
        .setDescription(
            "Click the button below to open the application. It should be pre-filled with your **Application ID**, which is a one-time code. This code is only valid for you, and only once."
        )
        .addField("Application ID", applicationId);

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", url: link, label: "Open Application" })
    ]);

    await ctx.editReply({ embeds: [embed], components: [actionRow] });
});

export default command;
