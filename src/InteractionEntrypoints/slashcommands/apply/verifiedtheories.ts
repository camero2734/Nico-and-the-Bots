import {
    ActionRowBuilder,
    MessageActionRowComponent,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    Message,
    TextChannel
} from "discord.js";
import R from "ramda";
import { channelIDs, guildID, roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { Question } from "../../../Helpers/verified-quiz/question";
import QuizQuestions from "../../../Helpers/verified-quiz/quiz"; // .gitignored
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { TimedInteractionListener } from "../../../Structures/TimedInteractionListener";
import { PreviousAnswersEncoder, QuestionIDEncoder, VerifiedQuizConsts } from "./_consts";
export { VerifiedQuizConsts } from "./_consts";

const command = new SlashCommand(<const>{
    description: "Opens an application for the verified-theories channel",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    // If they already have the VQ role then no need to take again
    if (ctx.member.roles.cache.has(roles.verifiedtheories)) {
        throw new CommandError("You already passed the quiz!");
    }

    // Ensure they can't retake the quiz for N hours
    const waitTime = await prisma.verifiedQuiz.upsert({
        where: { userId: ctx.member.id },
        create: { userId: ctx.member.id, lastTaken: new Date(0) },
        update: {}
    });

    const remainingTime = waitTime.lastTaken.getTime() + VerifiedQuizConsts.DELAY_BETWEEN_TAKING - Date.now();
    if (remainingTime > 0 && !ctx.member.roles.cache.has(roles.staff)) {
        const hours = (remainingTime / (1000 * 60 * 60)).toFixed(2);
        throw new CommandError(`You must wait ${hours} hours before applying again.`);
    }

    // Ensure they're ready to take the quiz
    const initialEmbed = new EmbedBuilder()
        .setTitle("Verified Theories Quiz")
        .setDescription(
            [
                `This quiz asks various questions related to the lore of the band. There are ${VerifiedQuizConsts.NUM_QUESTIONS} questions and you must answer them *all* correctly.`,
                `**If you fail the quiz, you must wait ${VerifiedQuizConsts.DELAY_BETWEEN_TAKING_HOURS} hours before trying again.** If you aren't ready to take the quiz, you can safely dismiss this message. When you're ready, hit Begin below.`,
                `*Note:* Select your answers very carefully - **once you select an answer, it is final.**`
            ].join("\n\n")
        )
        .addFields({
            name: "Cheating is not allowed",
            value: "You may use relevant sites as reference to find the answers, but do NOT upload them, share them, etc. Any cheating will result in an immediate and permanent ban from the channel."
        });

    let dmMessage: Message;
    try {
        const dm = await ctx.member.createDM();
        dmMessage = await dm.send({ embeds: [initialEmbed], components: [] });
    } catch (e) {
        throw new CommandError("You must have server DMs enabled to use this command");
    }

    const timedListener = new TimedInteractionListener(dmMessage, <const>["verifbegin", "verifcancel"]);
    const [beginId, cancelId] = timedListener.customIDs;

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder().setLabel("Begin").setStyle(ButtonStyle.Success).setCustomId(beginId),
        new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Danger).setCustomId(cancelId)
    );

    await dmMessage.edit({ components: [actionRow] });

    const dmActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(dmMessage.url).setLabel("View message")
    );

    await ctx.send({
        embeds: [new EmbedBuilder().setDescription("The quiz was DM'd to you!").toJSON()],
        components: [dmActionRow]
    });

    const [buttonPressed, bctx] = await timedListener.wait();

    await bctx?.deferUpdate();

    if (buttonPressed !== beginId) {
        await dmMessage.edit({
            embeds: [new EmbedBuilder().setDescription("Okay, you may restart the quiz at any time.")],
            components: []
        });
        return;
    }

    // Update database
    await prisma.verifiedQuiz.update({
        where: { userId: ctx.user.id },
        data: { lastTaken: new Date(), timesTaken: { increment: 1 } }
    });

    // Generate initial variables
    const questionList = F.shuffle(QuizQuestions).slice(0, VerifiedQuizConsts.NUM_QUESTIONS);
    const answerEncoder = new PreviousAnswersEncoder(questionList);
    const questionIDs = QuestionIDEncoder.encode(questionList);
    const [quizEmbed, quizComponents] = await generateEmbedAndButtons(-1, questionList, answerEncoder, questionIDs, ctx.member); // prettier-ignore

    await dmMessage.edit({
        embeds: [quizEmbed.toJSON()],
        components: quizComponents
    });
});

const veriquizArgs = <const>["currentID", "questionIDs", "previousAnswers", "chosenAnswer"];
const genVeriquizId = command.addInteractionListener("veriquiz", veriquizArgs, async (ctx, args) => {
    const { currentID, questionIDs, previousAnswers, chosenAnswer } = args;

    await ctx.deferUpdate();

    const actionRow = ctx.message.components[0];
    actionRow.components.map(c => {
        return { ...c.data, disabled: true };
    })

    await ctx.editReply({ components: [actionRow] }); // Remove buttons to prevent multiple presses

    const guild = await ctx.client.guilds.fetch(guildID);

    const member = await guild.members.fetch(ctx.user.id);

    if (!member) return console.log(`[Verified Quiz] Member does not exist: ${ctx.user.id}`);

    const questionList = QuestionIDEncoder.decode(questionIDs);

    // Update answer list
    const currentIndex = questionList.findIndex((q) => q.hexID === currentID);
    const answerEncode = new PreviousAnswersEncoder(questionList).fromString(previousAnswers);
    answerEncode.markAnswer(questionList[currentIndex], chosenAnswer);

    if (!questionList || questionList.length === 0) {
        console.log("BAD", args);
        return;
    }

    const [embed, components] = await generateEmbedAndButtons(
        currentIndex,
        questionList,
        answerEncode,
        questionIDs,
        member
    );

    await ctx.editReply({ embeds: [embed], components: components });
});

async function generateEmbedAndButtons(
    currentIndex: number,
    questionList: Question[],
    answerEncode: PreviousAnswersEncoder,
    questionIDs: string,
    member: GuildMember
): Promise<[EmbedBuilder, ActionRowBuilder<MessageActionRowComponent>[]]> {
    // Generate embed
    const newIndex = currentIndex + 1;
    const numQs = questionList.length;

    if (newIndex === numQs) return sendFinalEmbed(questionList, answerEncode, member);

    const newQuestion = questionList[newIndex];
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Question ${newIndex + 1} / ${numQs}` })
        .setTitle("Verified Theories Quiz")
        .setDescription(newQuestion.question)
        .setFooter({ text: "Select the correct answer by hitting a button below" });

    // Update variables and encode into buttons' customIDs
    const components = F.shuffle(
        newQuestion.answers.map((answer, idx) => {
            return new ButtonBuilder()
                .setLabel(answer)
                .setStyle(ButtonStyle.Primary)
                .setCustomId(
                    genVeriquizId({
                        currentID: newQuestion.hexID,
                        questionIDs,
                        previousAnswers: answerEncode.toString(),
                        chosenAnswer: idx.toString()
                    })
                );
        })
    );

    const actionRows = R.splitEvery(5, components).map((cs) => new ActionRowBuilder<ButtonBuilder>().setComponents(...cs));

    return [embed, actionRows];
}

async function sendFinalEmbed(
    questionList: Question[],
    answerEncode: PreviousAnswersEncoder,
    member: GuildMember
): Promise<[EmbedBuilder, ActionRowBuilder<MessageActionRowComponent>[]]> {
    const answers = answerEncode.answerIndices;

    // Send to staff channel
    const staffEmbed = new EmbedBuilder().setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() });

    let incorrect = 0;
    for (const q of questionList) {
        const answerGiven = answers.get(q) ?? -1;
        if (answerGiven !== q.correct) incorrect++;

        const givenAnswerText = q.answers[answerGiven] || "None";
        const correctAnswerText = q.answers[q.correct];
        staffEmbed.addFields({
            name: q.question.split("\n")[0],
            value: `🙋 ${givenAnswerText}\n📘 ${correctAnswerText}`
        });

        // Record question answer
        await prisma.verifiedQuizAnswer.create({
            data: { userId: member.id, answer: answerGiven, questionId: q.id }
        });
    }
    const correct = questionList.length - incorrect;
    const passed = incorrect === 0;
    const hours = VerifiedQuizConsts.DELAY_BETWEEN_TAKING_HOURS;

    staffEmbed
        .setTitle(`${passed ? "Passed" : "Failed"}: ${correct}/${questionList.length} correct`)
        .setColor(passed ? 0x88ff88 : 0xff8888);
    const staffChan = member.guild.channels.cache.get(channelIDs.verifiedapplications) as TextChannel;
    await staffChan.send({ embeds: [staffEmbed] });

    if (passed) {
        await member.roles.add(roles.verifiedtheories);
    }

    // Send embed to normal user
    const embed = new EmbedBuilder()
        .setTitle(`${correct}/${questionList.length} correct`)
        .setColor(passed ? 0x88ff88 : 0xff8888)
        .setDescription(
            `You ${passed ? "passed" : "failed"} the verified theories quiz${passed ? "!" : "."}\n\n${passed
                ? `You can now access <#${channelIDs.verifiedtheories}>`
                : `You may apply again in ${hours} hours.`
            }`
        );

    // Dm them results
    try {
        const dm = await member.createDM();
        await dm.send({ embeds: [embed] });
    } catch (e) {
        //
    }

    return [embed, []];
}

export default command;
