/**
 * Randomly drops 5 prizes that only a certain number of users can claim
 *
 * Basically just an embed with a button
 */

import { MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { NicoClient } from "../../../app";
import { CommandError } from "../../Configuration/definitions";
import { MessageTools } from "../../Helpers";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { MessageInteraction } from "../../Structures/EntrypointMessageInteraction";
import { calculateNextPrize, DropPrize, getDropName, getPrizeName } from "./_consts.randomDrop";

const NUM_BUTTONS = 20;

async function runDrop(prize: DropPrize, channel: TextChannel): Promise<void> {
    const dropName = getDropName(prize);
    const prizeName = getPrizeName(prize);
    const randomNoun = F.randomValueInArray(["a rock", "a tree", "an air molecule", "Keons", "Clancy", "a vulture"]);
    const quantity = prize.quantity;

    const theFirstUsers = `The first ${quantity === 1 ? "user" : `**${quantity}** users`}`;

    const embed = new MessageEmbed()
        .setAuthor(`Nico tripped over ${randomNoun}`, NicoClient.user?.displayAvatarURL())
        .setColor("RED")
        .addField(`He dropped ${dropName}`, `${theFirstUsers} to claim this prize will win ${prizeName}`);

    const winningIndices = F.sample(F.indexArray(NUM_BUTTONS), prize.quantity);

    const drop = await prisma.randomDrop.create({ data: {} });

    const buttons = F.indexArray(NUM_BUTTONS).map(
        (idx) =>
            new MessageButton({
                label: `???`,
                style: "PRIMARY",
                customId: GenBtnId({
                    dropId: drop.id,
                    idx: `${idx}`,
                    isPrize: winningIndices.includes(idx) ? "1" : "0"
                })
            })
    );

    const actionRows = MessageTools.allocateButtonsIntoRows(buttons);

    await channel.send({ embeds: [embed], components: actionRows });
}

export function testDrop(channel: TextChannel) {
    const { prize } = calculateNextPrize();
    runDrop(prize, channel);
}

const msgInt = new MessageInteraction();

export const GenBtnId = msgInt.addInteractionListener(
    "dropGuess",
    <const>["dropId", "idx", "isPrize"],
    async (ctx, args) => {
        await ctx.deferUpdate();

        if (!ctx.isButton()) return;

        const components = ctx.message.components;
        const idx = +args.idx;
        const isPrize = args.isPrize === "1";

        // Ensure only one person can hit a button by using DB unique constraint
        try {
            await prisma.randomDropGuess.create({ data: { randomDropId: args.dropId, userId: ctx.user.id, idx } });
        } catch (e) {
            throw new CommandError("Someone else already guessed this one!");
        }

        const btnPressed = (() => {
            for (const actionRow of components) {
                for (const button of actionRow.components) {
                    if (button.type !== "BUTTON") continue;
                    if (button.customId === ctx.customId) return button;
                }
            }
        })();
        if (!btnPressed) return;

        btnPressed.setDisabled(true);
        btnPressed.setStyle("SECONDARY");
        btnPressed.setLabel(F.ellipseText(ctx.member.displayName, 80));
        btnPressed.setEmoji(isPrize ? "✅" : "❌");

        await ctx.editReply({ components });

        await ctx.followUp({ content: isPrize ? "You won!" : "You got nothing", ephemeral: true });
    }
);

export default msgInt;
