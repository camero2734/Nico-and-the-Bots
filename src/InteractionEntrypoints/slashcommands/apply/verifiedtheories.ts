import { en, Faker } from "@faker-js/faker";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    channelMention,
    ComponentType,
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
import { guild } from "../../../../app";
import { channelIDs, guildID, roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { Question } from "../../../Helpers/verified-quiz/question";
import QuizQuestions from "../../../Helpers/verified-quiz/quiz"; // .gitignored
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { caesarEncode, generateWords, morseEncode, PreviousAnswersEncoder, QuestionIDEncoder, VerifiedQuizConsts } from "./_consts";
export { VerifiedQuizConsts } from "./_consts";

const command = new SlashCommand({
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
        .setTitle("<:cliffordpopcorn:893992063677366295> Vultue Verification Validator")
        .setDescription(
            [
                "# Verified Quiz",
                `This quiz is required for access to <#${channelIDs.verifiedtheories}>.`,
                "There are two parts to the quiz. The first part is a series of encoded sentences that you must decode. The second part is a series of multiple choice questions.",
                `**If you fail either part of the quiz, you must wait ${VerifiedQuizConsts.DELAY_BETWEEN_TAKING_HOURS} hours before trying again.**`,
                "## Part 1: Decoding",
                "This part asks you to decode sentences that are encoded in various ways. You must decode them all correctly to proceed. All answers are case-insensitive and spaces are ignored. They are composed of valid English words, like `sometimes retrieve good insubstantial sanity`",
                "Replace the encoded value with the decoded sentence in each input box. If you lose the original cipher, close the modal and click on the 'Reopen' button to get it back.",
                "It's recommended you do this part from a computer if possible, but it's not required.",
                "## Part 2: Multiple choice questions",
                `This quiz asks various questions related to the lore of the band. There are ${VerifiedQuizConsts.NUM_QUESTIONS} questions and you must answer them *all* correctly.`,
                `*Note:* Select your answers very carefully - **once you select an answer, it is final.**`,
                "If you aren't ready to take the quiz, you can safely dismiss this message. When you're ready, hit Begin below.",
                "## Part 3: You're in! Rules and guidelines",
                "If you pass the quiz, you will be granted access to the channel. There's some rules and guidelines you must follow to keep your access. You'll be presented with these after you pass the quiz."
            ].join("\n\n")
        )
        .addFields([
            {
                name: "Cheating is not allowed",
                value: "You may use relevant sites as reference to find the answers, but do NOT upload them, share them, etc. Any cheating will result in an immediate and permanent ban from the channel."
            },
            {
                name: "Access is conditional",
                value: "Once granted, access to the channel is conditional on following the rules. If you break the rules, you will be removed from the channel and will not be able to reapply for a set period of time."
            }
        ]);

    let dmMessage: Message;
    try {
        const dm = await ctx.member.createDM();
        dmMessage = await dm.send({ embeds: [initialEmbed], components: [] });
    } catch (e) {
        throw new CommandError("You must have server DMs enabled to use this command");
    }

    const seed36 = F.hashToInt(`${ctx.user.id}:${Date.now()}`).toString(36);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder().setLabel("Begin").setStyle(ButtonStyle.Success).setCustomId(genModalId({ seed36 })),
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

const genModalId = command.addInteractionListener("verifmodal", ["seed36"], async (ctx, args) => {
    if (!ctx.isButton()) return;

    const seed = parseInt(args.seed36, 36);

    const modal = new ModalBuilder()
        .setTitle("Verified Theories Quiz -- Part 1")
        .setCustomId(genModalSubmitId({ seed36: args.seed36 }));

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

    // Update database. At this point they must wait the full time to retake the quiz.
    await prisma.verifiedQuiz.update({
        where: { userId: ctx.user.id },
        data: { lastTaken: new Date(), timesTaken: { increment: 1 } }
    });

    const dmActionRow = new ActionRowBuilder<ButtonBuilder>(ctx.message.components[0].toJSON());
    const beginBtn = dmActionRow.components.find(c => (c.data.label === "Begin" || c.data.label === "Reopen"));
    const cancelBtn = dmActionRow.components.find(c => c.data.label === "Cancel");

    if (!beginBtn || !cancelBtn) throw new Error("Invalid components");

    beginBtn.setLabel("Reopen");
    cancelBtn.setDisabled(true);

    const embed = new EmbedBuilder(ctx.message.embeds[0].toJSON());
    embed.setFooter({ text: "You have started the quiz. Click 'Reopen' to continue." });

    await ctx.editReply({ components: [dmActionRow], embeds: [embed] });
});

const genModalSubmitId = command.addInteractionListener("verifmodaldone", ["seed36"], async (ctx, args) => {
    if (!ctx.isModalSubmit()) return;
    await ctx.deferUpdate({ fetchReply: true });

    // Determine if they entered the correct answers to part one
    const seed = parseInt(args.seed36, 36);
    const partOne = generatePartOne(seed);

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z]/g, "").trim();

    let correct = true;
    for (const key in partOne) {
        const inputted = ctx.fields.getTextInputValue(key);
        const expected = partOne[key].decoded;
        if (normalize(inputted) !== normalize(expected)) {
            correct = false;
            break;
        }
    }

    // Send to staff
    const staffEmbed = new EmbedBuilder()
        .setAuthor({ name: ctx.user.username, iconURL: ctx.user.displayAvatarURL() })
        .setTitle(`${correct ? "Passed" : "Failed"}: Part 1`)
        .setColor(correct ? "Blurple" : 0xff8888)
        .setFooter({ text: ctx.user.id });

    for (const key in partOne) {
        const inputted = ctx.fields.getTextInputValue(key);
        const expected = partOne[key].decoded;
        const encoded = partOne[key].encoded;
        staffEmbed.addFields({ name: key, value: `**Encoded**: ${encoded}\n**Expected**: ${expected}\n**Received**: ${inputted}`.substring(0, 1000) });
    }

    if (!correct) {
        // Send to user
        const hours = VerifiedQuizConsts.DELAY_BETWEEN_TAKING_HOURS;
        const embed = new EmbedBuilder()
            .setColor(0xff8888)
            .setDescription(
                `You failed the verified theories quiz.\n\nYou may apply again in ${hours} hours.`
            );
        await ctx.editReply({
            embeds: [embed],
            components: []
        });

        return;
    }

    const guild = await ctx.client.guilds.fetch(guildID);
    const staffChan = await guild?.channels.fetch(channelIDs.verifiedapplications);
    if (staffChan?.isTextBased()) await staffChan.send({ embeds: [staffEmbed] });

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
        .setTitle("Verified Theories Quiz -- Part 2")
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

    // Send embed to normal user
    const embed = new EmbedBuilder()
        .setTitle(`${correct}/${questionList.length} correct`)
        .setColor(passed ? 0x88ff88 : 0xff8888)
        .setDescription(
            `You ${passed ? "passed" : "failed"} the verified theories quiz${passed ? "!" : "."}\n\n${passed
                ? `**:warning: Before gaining access to the channel**, please read the following rules and select the correct answers to ensure you fully understand them.`
                : `You may apply again in ${hours} hours.`
            }`
        );

    if (!passed) return [embed, []];

    embed.setTitle("VERIFIED AGREEMENT -- PLEASE READ");
    embed.addFields([
        { name: "Be On Topic", value: "All discussion must be related to theories and lore of the band." },
        { name: "Be Informed", value: `Make sure you're up to date by reading ${channelMention(channelIDs.loreupdates)} and ${channelMention(channelIDs.confirmedfakestuff)}` },
        { name: "Be Constructive", value: "All discussion should be constructive and respectful of others." },
        { name: "No General Discussion", value: `General discussion should be kept to the appropriate channels, like ${channelMention(channelIDs.hometown)} or ${channelMention(channelIDs.slowtown)}. Memes belong in  ${channelMention(channelIDs.eramemes)}.` },
        { name: "No Spoilers", value: "Do not spoil any leaked or unofficial content for others. This does not include official teasers, like dmaorg.info." },
    ]);

    const createSelect = (selectMenu: StringSelectMenuBuilder) => new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const questions = [
        ["I'll be on topic in the channel", "I can discuss anything I want", "I might send some memes"],
        ["I'll keep up to date before posting", "I don't need to know anything", "I can make up my own lore"],
        ["I will respect other's theories", "I will dismiss anyone who doesn't agree with me", "I will dunk on bad theories"],
        ["I won't talk about random things", "I'll break out into a random topic", "I'll send so many jokes"],
        ["I won't discuss leaked content", "I'll share leaked content", "I am become leaker, destroyer of surprises"]
    ].map(x => x.map((y, idx) => ({ label: y, value: idx.toString() }))).map(x => F.shuffle(x));

    const actionRows = questions.map((q, idx) => {
        const selectMenu = new StringSelectMenuBuilder()
            .setPlaceholder("Select the most appropriate answer")
            .setCustomId(genPartThreeBtnId({ idx: idx.toString() }))
            .setOptions(q.map(x => new StringSelectMenuOptionBuilder(x)));
        return createSelect(selectMenu);
    });

    return [embed, actionRows];
}

const genPartThreeBtnId = command.addInteractionListener("verifopenmodalagree", ["idx"], async (ctx, args) => {
    if (!ctx.isStringSelectMenu()) return;

    await ctx.deferUpdate();

    const passed = ctx.values.every(v => v === "0");
    if (!passed) return;

    // Disable this select menu
    const idx = parseInt(args.idx);

    const newActionRows = ctx.message.components.map((row, i) => {
        if (i !== idx) return row;

        const jsonComponent = row.components[0].toJSON();
        if (jsonComponent.type !== ComponentType.StringSelect) return row;

        const newSelectMenu = new StringSelectMenuBuilder(jsonComponent);
        newSelectMenu.setDisabled(true);
        newSelectMenu.setPlaceholder("You have agreed to this rule");

        return new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(newSelectMenu);
    });

    await ctx.editReply({ components: newActionRows });

    // Check if all answers are correct
    const allCorrect = newActionRows.every(row => {
        const selectMenu = row.components[0].toJSON();
        return selectMenu.type === ComponentType.StringSelect && selectMenu.disabled;
    });

    if (!allCorrect) return;

    const member = await guild.members.fetch(ctx.user.id);
    await member.roles.add(roles.verifiedtheories);

    await ctx.editReply({
        content: `You now have access to the ${channelMention(channelIDs.verifiedtheories)} channel!`,
        components: [],
        embeds: []
    });
});

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
