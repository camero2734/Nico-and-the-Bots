import { EmbedField, Message, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { queries } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { TimedInteractionListener } from "../../../Structures/TimedInteractionListener";
import { createFBApplication } from "./_consts";

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

    const thread = await ctx.channel.threads.create({
        type: "GUILD_PRIVATE_THREAD",
        autoArchiveDuration: 60,
        name: `${ctx.member.displayName} Firebreather Application`,
        invitable: false
    });

    const dbUser = await queries.findOrCreateUser(ctx.member.id, { warnings: true });

    const msg = await thread.send({
        content: `${ctx.member}`, // Mention the user to invite them to the thread
        embeds: [new MessageEmbed({ description: "Setting up the application..." })]
    });

    const application = await createFBApplication(msg, ctx.member);

    const replyActionRow = new MessageActionRow().addComponents([
        new MessageButton({ label: "View thread", style: "LINK", url: msg.url })
    ]);

    await ctx.send({
        embeds: [new MessageEmbed({ description: "The application is available in the thread you were mentioned in" })],
        components: [replyActionRow]
    });

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

    const timedListener = new TimedInteractionListener(msg, <const>["submitId"]);
    const [submitId] = timedListener.customIDs;

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ label: "Submit", customId: submitId, style: "SUCCESS" })
    ]);

    await msg.edit({
        embeds: [confirmationEmbed],
        components: [actionRow]
    });

    const [buttonPressed] = await timedListener.wait();

    if (msg.channel.type === "GUILD_PRIVATE_THREAD") await msg.channel.delete();
    if (buttonPressed !== submitId) {
        await ctx.followUp({
            content: `${ctx.member}`,
            embeds: [new MessageEmbed({ description: "Your application was not submitted." })],
            ephemeral: true
        });
        return;
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
    ctx.followUp({ content: `${ctx.member}`, embeds: [sentEmbed], components: [], ephemeral: true });
});

export default command;
