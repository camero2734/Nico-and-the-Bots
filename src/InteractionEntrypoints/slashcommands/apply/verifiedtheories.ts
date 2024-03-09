import { Faker, en } from "@faker-js/faker";
import { roundToNearestMinutes } from "date-fns";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    Message,
    MessageActionRowComponentBuilder,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import { channelIDs, guildID, roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { Question } from "../../../Helpers/verified-quiz/question";
import QuizQuestions from "../../../Helpers/verified-quiz/quiz"; // .gitignored
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { PreviousAnswersEncoder, QuestionIDEncoder, VerifiedQuizConsts, caesarEncode, generateWords, morseEncode } from "./_consts";
export { VerifiedQuizConsts } from "./_consts";

const command = new SlashCommand({
    description: "Opens an application for the verified-theories channel",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    if (ctx.user.id !== userIDs.me) throw new CommandError("This command is currently disabled");

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
        .addFields([{
            name: "Cheating is not allowed",
            value: "You may use relevant sites as reference to find the answers, but do NOT upload them, share them, etc. Any cheating will result in an immediate and permanent ban from the channel."
        }]);

    let dmMessage: Message;
    try {
        const dm = await ctx.member.createDM();
        dmMessage = await dm.send({ embeds: [initialEmbed], components: [] });
    } catch (e) {
        throw new CommandError("You must have server DMs enabled to use this command");
    }

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder().setLabel("Begin").setStyle(ButtonStyle.Success).setCustomId(genModalId({})),
        new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Danger).setCustomId(genCancelId({}))
    ]);

    await dmMessage.edit({ components: [actionRow] });

    const dmActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(dmMessage.url).setLabel("View message")
    ]);

    await ctx.editReply({
        embeds: [new EmbedBuilder().setDescription("The quiz was DM'd to you!")],
        components: [dmActionRow]
    });
});

const genCancelId = command.addInteractionListener("verifcancel", [], async (ctx) => {
    if (!ctx.isButton()) return;

    await ctx.deferUpdate();
    await ctx.editReply({
        embeds: [new EmbedBuilder().setDescription("Okay, you may restart the quiz at any time.")],
        components: []
    });
});

const genModalId = command.addInteractionListener("verifmodal", [], async (ctx) => {
    if (!ctx.isButton()) return;

    // Ensure the user gets the same questions every time (but different after a while)
    const currentTime = roundToNearestMinutes(new Date(), { nearestTo: 30 }).getTime();
    const seed = F.hashToInt(`${ctx.user.id}:${currentTime}`);

    const modal = new ModalBuilder()
        .setTitle("Verified Theories Quiz -- Part 1")
        .setCustomId(genModalSubmitId({ seed36: seed.toString(36) }));

    const questions = generatePartOne(seed);

    const components = [];
    for (const [key, { encoded }] of Object.entries(questions)) {
        const component = new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
                .setCustomId(key)
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Enter the decoded sentence here")
                .setLabel("Decode the following")
                .setValue(encoded)
        );
        components.push(component);
    }

    modal.setComponents(components);

    await ctx.showModal(modal);
});

const genModalSubmitId = command.addInteractionListener("verifmodaldone", ["seed36"], async (ctx, args) => {
    if (!ctx.isModalSubmit()) return;
    await ctx.deferUpdate({ fetchReply: true });

    // Determine if they entered the correct details
    const seed = parseInt(args.seed36, 36);
    const partOne = generatePartOne(seed);

    const normalize = (str: string) => str.replace(/ /g, "").toLowerCase().trim();

    let correct = true;
    for (const key in partOne) {
        const inputted = ctx.fields.getTextInputValue(key);
        const expected = partOne[key].decoded;
        if (normalize(inputted) !== normalize(expected)) {
            correct = false;
            break;
        }
    }

    if (!correct) {
        await ctx.editReply({
            embeds: [new EmbedBuilder().setDescription("You entered at least one answer incorrectly. Try again later.")],
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

    await ctx.editReply({ embeds: [quizEmbed], components: quizComponents });
});

const genVeriquizId = command.addInteractionListener("veriquiz", ["currentID", "questionIDs", "previousAnswers"], async (ctx, args) => {
    if (!ctx.isStringSelectMenu()) return;

    const { currentID, questionIDs, previousAnswers } = args;
    const chosenAnswer = ctx.values[0];

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
): Promise<[EmbedBuilder, ActionRowBuilder<MessageActionRowComponentBuilder>[]]> {
    // Generate embed
    const newIndex = currentIndex + 1;
    const numQs = questionList.length;

    if (newIndex === numQs) return sendFinalEmbed(questionList, answerEncode, member);

    const newQuestion = questionList[newIndex];
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Question ${newIndex + 1} / ${numQs}` })
        .setTitle("Verified Theories Quiz")
        .setDescription(newQuestion.question)
        .setFooter({ text: "Select the correct answer by selecting an option below" });

    const selectMenu = new StringSelectMenuBuilder();
    selectMenu.setPlaceholder(newQuestion.question.slice(0, 150));
    selectMenu.setCustomId(genVeriquizId({
        currentID: newQuestion.hexID,
        questionIDs,
        previousAnswers: answerEncode.toString(),
    }));
    selectMenu.setOptions(F.shuffle(newQuestion.answers.map((answer, idx) => {
        return new StringSelectMenuOptionBuilder({
            label: answer,
            value: idx.toString(),
        });
    })));

    const actionRows = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)];

    return [embed, actionRows];
}

async function sendFinalEmbed(
    questionList: Question[],
    answerEncode: PreviousAnswersEncoder,
    member: GuildMember
): Promise<[EmbedBuilder, ActionRowBuilder<MessageActionRowComponentBuilder>[]]> {
    const answers = answerEncode.answerIndices;

    // Send to staff channel
    const staffEmbed = new EmbedBuilder().setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() });

    let incorrect = 0;
    for (const q of questionList) {
        const answerGiven = answers.get(q) ?? -1;
        if (answerGiven !== q.correct) incorrect++;

        const givenAnswerText = q.answers[answerGiven] || "None";
        const correctAnswerText = q.answers[q.correct];
        staffEmbed.addFields([{
            name: q.question.split("\n")[0],
            value: `🙋 ${givenAnswerText}\n📘 ${correctAnswerText}`
        }]);

        // Record question answer
        await prisma.verifiedQuizAnswer.create({
            data: { userId: member.id, answer: answerGiven, questionId: q.permaId }
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

    return [embed, []];
}

function generatePartOne(seed: number) {
    const faker = new Faker({ locale: [en] });
    faker.seed(seed);

    // Morse code
    const validCharacters = "😀😁😂🤣😃😄😅😆😊😋😎🥲🤔😔😓🫤🙃😭😤😧🤬😡🤡🥺🥳🧐";
    const [dotChar, dashChar] = faker.helpers.shuffle([...validCharacters]);

    const morseDecoded = generateWords(faker);
    const morse = morseEncode(morseDecoded, dotChar, dashChar);

    // Caeser cipher
    const rot = faker.number.int({ min: 1, max: 25 });
    const caesarDecoded = generateWords(faker);
    const caesar = caesarEncode(caesarDecoded, rot);

    // ASCII
    const randomBase = faker.helpers.arrayElement([2, 10, 16]);

    const asciiDecoded = generateWords(faker);
    const ascii = asciiDecoded.split("").map((c) => c.charCodeAt(0).toString(randomBase)).join(" ");

    const options = {
        morse: { encoded: morse, decoded: morseDecoded },
        caesar: { encoded: caesar, decoded: caesarDecoded },
        ascii: { encoded: ascii, decoded: asciiDecoded }
    };
    const order = faker.helpers.shuffle(Object.keys(options)) as Array<keyof typeof options>;

    return Object.fromEntries(order.map((key) => [key, options[key]]));
}

export default command;
