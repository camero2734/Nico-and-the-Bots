/**
 * Randomly drops 5 prizes that only a certain number of users can claim
 *
 * Basically just an embed with a button
 */

import { RandomDrop } from ".prisma/client";
import { Colors, EmbedBuilder, TextChannel } from "discord.js";
import { NicoClient } from "../../../app";
import { CommandError } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { prisma, PrismaType } from "../../Helpers/prisma-init";
import { MessageInteraction } from "../../Structures/EntrypointMessageInteraction";
import {
    calculateNextPrize,
    DropPrize,
    generateActionRows,
    getDropName,
    getPrizeName,
    givePrize,
    Guess
} from "./_consts.randomDrop";

const NUM_BUTTONS = 20;

async function runDrop(prize: DropPrize, channel: TextChannel): Promise<void> {
    const dropName = getDropName(prize);
    const prizeName = getPrizeName(prize);
    const randomNoun = F.randomValueInArray(["a rock", "a tree", "an air molecule", "Keons", "Clancy", "a vulture"]);
    const quantity = prize.quantity;

    const theFirstUsers = `The first ${quantity === 1 ? "user" : `**${quantity}** users`}`;

    const winningIndices = F.sample(F.indexArray(NUM_BUTTONS), prize.quantity);
    const maxGuessesPerUser = 2;

    const embed = new EmbedBuilder()
        .setAuthor({ name: `Nico tripped over ${randomNoun}`, iconURL: NicoClient.user?.displayAvatarURL() })
        .setColor(Colors.Red)
        .addFields([{
            name: `He dropped ${dropName}`,
            value: `${theFirstUsers} to claim this prize will win ${prizeName}`
        }])
        .setFooter({ text: `Each user may guess ${maxGuessesPerUser} time${F.plural(maxGuessesPerUser)}` });

    const drop = await prisma.randomDrop.create({ data: { prize, maxGuessesPerUser, winningIndices } });

    const components = await generateActionRows([], drop);

    await channel.send({ embeds: [embed], components });
}

export function runDropInChannel(channel: TextChannel) {
    const { prize } = calculateNextPrize();
    runDrop(prize, channel);
}

export async function createNewDrop() {
    // const possibleChannels = [
    //     channelIDs.hometown,
    //     channelIDs.slowtown,
    //     channelIDs.off
    // ]
    // runDropInChannel(channel);
}

const msgInt = new MessageInteraction();

export const GenBtnId = msgInt.addInteractionListener("dropGuess", <const>["dropId", "idx"], async (ctx, args) => {
    await ctx.deferUpdate();

    if (!ctx.isButton()) return;

    const idx = +args.idx;

    // Ensure only one person can hit a button and that a user doesn't hit more than maxGuessesPerUser
    let randomDrop = null as RandomDrop | null;
    try {
        await prisma.$transaction((async (tx: PrismaType) => {
            const guess = await tx.randomDropGuess.create({
                data: { randomDropId: args.dropId, userId: ctx.user.id, idx },
                include: { randomDrop: true }
            });
            const count = await tx.randomDropGuess.count({
                where: { randomDropId: args.dropId, userId: ctx.user.id }
            });

            if (!guess.randomDrop) throw new Error("No drop");

            if (count > guess.randomDrop.maxGuessesPerUser)
                throw new CommandError("You've exceeded the max number of guesses");
            randomDrop = guess.randomDrop;
        }) as (tx: any) => Promise<void>); // The default TS type for transactions is so overly convoluted that is slows down the entire editor
    } catch (e) {
        if (e instanceof CommandError) throw e;
        else throw new CommandError("Someone else already guessed this one!");
    }

    if (!randomDrop) throw new Error("No drop");

    const isPrize = randomDrop.winningIndices.includes(idx);

    // Update all buttons based on DB
    const dropGuesses = await prisma.randomDropGuess.findMany({ where: { randomDropId: args.dropId } });

    const guesses: Guess[] = await Promise.all(
        dropGuesses.map(async (guess) => {
            const member = await ctx.guild.members.fetch(guess.userId);
            return { member, idx: guess.idx };
        })
    );

    const newComponents = await generateActionRows(guesses, randomDrop);

    const prize = randomDrop.prize as DropPrize;
    if (isPrize) await givePrize(prize, ctx.member);

    await ctx.editReply({ components: newComponents });

    await ctx.followUp({
        content: isPrize ? `You won ${getPrizeName(prize)}!` : "You got nothing. Sorry, I guess.",
        ephemeral: true
    });
});

export default msgInt;
