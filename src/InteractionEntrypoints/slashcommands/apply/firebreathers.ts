import { channelIDs, roles } from "../../../configuration/config";
import { CommandError } from "../../../configuration/definitions";
import { DMChannel, EmbedField, Message, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { queries } from "../../../helpers/prisma-init";
import { SlashCommand } from "../../../structures/EntrypointSlashCommand";
import { TimedInteractionListener } from "../../../helpers/timed-interaction-listener";
import { createFBApplication } from "./_consts";

const command = new SlashCommand(<const>{
    description: "Opens an application to the Firebreathers role",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    if (!ctx.member.roles.cache.has(roles.staff)) {
        throw new CommandError("This command is not available yet.");
    }

    let dmMessage: Message;
    try {
        const dm = await ctx.member.createDM();
        dmMessage = await dm.send({ embeds: [new MessageEmbed({ description: "Setting up the application..." })] });
    } catch {
        await ctx.send({
            embeds: [new MessageEmbed({ description: "Your DMs must be enabled for this command to work." })]
        });
        return;
    }

    const application = await createFBApplication(dmMessage, ctx.member);

    await ctx.send({ embeds: [new MessageEmbed({ description: "The application was DM'd to you!" })] });

    const dbUser = await queries.findOrCreateUser(ctx.member.id, { warnings: true });

    const activityDescription = [
        `**Level:** ${dbUser.level}`,
        `**Joined on:** ${dbUser.joinedAt}`,
        `**Warnings:** ${dbUser.warnings.length}`
    ].join("\n");

    await application.askQuestion(
        "Welcome to the Firebreathers application!",
        "The Firebreathers role is an exclusive role offered to those highly active in the community. This application will ask a few simple questions and collect some data for the staff to review.\n\nWhen you are ready to proceed, **enter your favorite song from the band** and then click `Continue`."
    );

    await application.askQuestion(
        "Your activity",
        `Here are some stats we have stored about you:\n\n${activityDescription}\n\nNote that none of these have strict requirements, but they are useful for helping to determine involvement. Is there anything you would like to add?`,
        false
    );

    await application.askQuestion(
        "Where did you find out about our server?",
        "Common examples include Twitter, Reddit, a friend, etc."
    );

    await application.askQuestion(
        "Have you participated in any of the events Discord Clique has hosted? Would you be willing to help host events on the server?",
        "Events include things such as listening parties and game nights"
    );

    await application.askQuestion(
        "Is there any questionable behavior that the staff might find upon reviewing your server history?",
        "This encompasses things such as messages, warnings, and overall demeanor towards others. Please be as thorough as possible and provide context to anything that needs it."
    );

    await application.askQuestion(
        "If needed, would you be willing to be a staff member?",
        "This does not impact your FB application; please answer honestly."
    );

    await application.askQuestion(
        "Do you run any social media accounts you would like to share?",
        "This is absolutely not required, but is useful for determining your involvement in the community as a whole.",
        false
    );

    const answers = application.getAnswers();

    const confirmationEmbed = new MessageEmbed()
        .setTitle("Firebreathers Application")
        .setAuthor(ctx.member.displayName, ctx.user.displayAvatarURL())
        .setDescription(
            "Please ensure that the answers below are correct. If it is not, you may dismiss this message and restart."
        );

    for (const [question, answer] of Object.entries(answers)) {
        confirmationEmbed.addField(question, answer);
    }

    const timedListener = new TimedInteractionListener(ctx, <const>["submitId"]);
    const [submitId] = timedListener.customIDs;

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ label: "Submit", customId: submitId, style: "SUCCESS" })
    ]);

    await ctx.editReply({
        embeds: [confirmationEmbed],
        components: [actionRow]
    });

    const buttonPressed = await timedListener.wait();

    if (buttonPressed !== submitId) {
        ctx.editReply({ embeds: [new MessageEmbed({ description: "Your application was not submitted." })] });
    }

    const staffChan = ctx.member.guild.channels.cache.get(channelIDs.deapplications) as TextChannel;
    confirmationEmbed.setDescription("");
    confirmationEmbed.setFooter(ctx.user.id);
    confirmationEmbed.addField("\u200b", "\u200b");
    confirmationEmbed.addField("To approve/deny", `\`/staff answerfb applicationid:`);
    const cm = await staffChan.send({ embeds: [confirmationEmbed] });
    const field = confirmationEmbed.fields.find((f) => f.name === "To approve/deny") as EmbedField;
    field.value += ` ${cm.id}\``;
    await cm.edit({ embeds: [confirmationEmbed] });

    const sentEmbed = new MessageEmbed().setDescription(
        "Submitted to the staff team!\n\nWe will get back to you as soon as possible."
    );
    ctx.editReply({ embeds: [sentEmbed], components: [] });
});

export default command;
