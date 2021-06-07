import { channelIDs, roles } from "configuration/config";
import { CommandOptions, CommandRunner, ExtendedContext } from "configuration/definitions";
import { Economy } from "database/entities/Economy";
import { Item } from "database/entities/Item";
import { DMChannel, EmbedField, Message, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { ComponentActionRow } from "slash-create";

export const Options: CommandOptions = {
    description: "Opens an application to the Firebreathers role",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    const application = await withContext(ctx);

    await ctx.defer(true);

    const economy =
        (await ctx.connection.getRepository(Economy).findOne({ userid: ctx.member.id })) ||
        new Economy({ userid: ctx.member.id });
    const warnings = await ctx.connection.getMongoRepository(Item).count({ id: ctx.user.id, type: "Warning" });

    const activityDescription = [
        `**Level:** ${economy.level}`,
        `**Joined on:** ${ctx.member.joinedAt}`,
        `**Warnings:** ${warnings}`
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
        .setAuthor(ctx.member.displayName, ctx.user.avatarURL)
        .setDescription(
            "Please ensure that the answers below are correct. If it is not, you may dismiss this message and restart."
        );

    for (const [question, answer] of Object.entries(answers)) {
        confirmationEmbed.addField(question, answer);
    }

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ label: "Submit", customID: "submit", style: "SUCCESS" })
    ]);
    await ctx.editOriginal({
        embeds: [confirmationEmbed.toJSON()],
        components: [(<unknown>actionRow) as ComponentActionRow]
    });

    ctx.registerComponent("submit", async () => {
        const staffChan = ctx.member.guild.channels.cache.get(channelIDs.deapplications) as TextChannel;
        confirmationEmbed.setDescription("");
        confirmationEmbed.setFooter(ctx.user.id);
        confirmationEmbed.addField("\u200b", "\u200b");
        confirmationEmbed.addField("To approve/deny", `\`/staff answerfb applicationid:`);
        const cm = await staffChan.send(confirmationEmbed);
        const field = confirmationEmbed.fields.find((f) => f.name === "To approve/deny") as EmbedField;
        field.value += ` ${cm.id}\``;
        await cm.edit(confirmationEmbed);

        const sentEmbed = new MessageEmbed().setDescription(
            "Submitted to the staff team!\n\nWe will get back to you as soon as possible."
        );
        ctx.editOriginal({ embeds: [sentEmbed.toJSON()], components: [] });
        ctx.unregisterComponent("submit");
    });
};

const withContext = async (ctx: ExtendedContext) => {
    const channel = (<unknown>ctx.channel) as DMChannel;
    const role = await ctx.member.guild.roles.fetch(roles.deatheaters);
    const NO_RESPONSE = "*Nothing yet*";

    const answers: Record<string, string> = {};

    return {
        async askQuestion(question: string, description: string, requiresAnswer = true): Promise<string> {
            const embed = new MessageEmbed()
                .setTitle(question)
                .setColor(role?.hexColor as string)
                .setDescription(description)
                .addField("\u200b", "\u200b")
                .addField("Your response", NO_RESPONSE)
                .setFooter(
                    "Submit an answer by sending a message with your response. You may edit your response by sending another message. Press 'Continue' to submit your response."
                );

            const actionRow = new MessageActionRow();
            actionRow.addComponents([new MessageButton({ label: "Continue", customID: "continue", style: "PRIMARY" })]);

            await ctx.editOriginal({
                embeds: [embed.toJSON()],
                components: [(<unknown>actionRow) as ComponentActionRow]
            });

            // Listen for user messages
            const field = embed.fields.find((f) => f.name === "Your response") as EmbedField;
            const listener = channel.createMessageCollector((m) => m.author.id === ctx.user.id, { time: undefined });
            let answer = field.value;
            listener.on("collect", async (m: Message) => {
                answer = m.content;
                field.value = "```\n" + m.content + "```";

                await ctx.editOriginal({
                    embeds: [embed.toJSON()],
                    components: [(<unknown>actionRow) as ComponentActionRow]
                });
                await m.delete();
            });

            // Wait for user to press the button
            await new Promise((resolve) => {
                ctx.registerComponent("continue", (context) => {
                    if (requiresAnswer && field.value === NO_RESPONSE) {
                        embed.setColor("FF0000");
                        ctx.editOriginal({
                            embeds: [embed.toJSON()],
                            components: [(<unknown>actionRow) as ComponentActionRow]
                        });
                        return;
                    }
                    listener.stop();
                    ctx.unregisterComponent("continue");
                    resolve(context);
                });
            });

            answers[question] = answer;
            return answer;
        },
        getAnswers(): Record<string, string> {
            return answers;
        }
    };
};
