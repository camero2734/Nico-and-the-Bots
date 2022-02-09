import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { Embed } from "discord.js/packages/discord.js";
import F from "../../../Helpers/funcs";
import { prisma, queries } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { BOUNTY_NUM_CREDITS, districts } from "./_consts";
import { sendViolationNotice } from "../../../Helpers/dema-notice";

const command = new SlashCommand(<const>{
    description: "Reaps bounty by reporting a user to the Dema Council. Displays inventory if no user specified.",
    options: [
        {
            name: "user",
            description: "The user the bounty is on, who receives a violation notice if caught by the Bishops.",
            type: "USER",
            required: false
        }
    ]
});

command.setHandler(async (ctx) => {
    const user = ctx.opts.user;
    const isInventoryCmd = !user;

    if (ctx.opts.user === ctx.member.id) {
        throw new CommandError(
            "Sacred Vialist Amendment IV § 280 prohibits self-incrimination under the pretense of monetary gain"
        );
    }

    await ctx.deferReply({ ephemeral: isInventoryCmd });

    const dbUser = await queries.findOrCreateUser(ctx.member.id, { dailyBox: true });
    const dailyBox = dbUser.dailyBox ?? (await prisma.dailyBox.create({ data: { userId: ctx.member.id } }));

    if (isInventoryCmd) {
        const { steals, blocks } = dailyBox;

        const embed = new Embed()
            .setTitle("Your inventory")
            .addField("📑 Bounties", `${steals} bount${steals === 1 ? "y" : "ies"} available`, true)
            .addField(
                "<:jumpsuit:860724950070984735> Jumpsuits",
                `${blocks} jumpsuit${blocks === 1 ? "" : "s"} available`,
                true
            )
            .addField("Current bounty value", `${BOUNTY_NUM_CREDITS} credits`)
            .setFooter(
                "You can use a bounty by mentioning the user in the command. You will recieve the bounty amount if successful. A jumpsuit is automatically used to protect you from being caught when a bounty is enacted against you."
            );

        await ctx.send({ embeds: [embed.toJSON()] });
        return;
    }

    // Perform some checks
    if (user === userIDs.me) throw new CommandError(`The Dema Council has no interest in prosecuting <@${userIDs.me}>.`); // prettier-ignore
    if (dailyBox.steals < 1) throw new CommandError("You have no bounties to use. Try to get some by using `/econ resupply`."); // prettier-ignore

    const member = await ctx.member.guild.members.fetch(user);
    if (!member || member.user.bot) throw new CommandError(`${member.displayName} investigated himself and found no wrong-doing. Case closed.`); // prettier-ignore
    
    const otherDBUser = await queries.findOrCreateUser(member.id, { dailyBox: true });
    const otherDailyBox = otherDBUser.dailyBox ?? (await prisma.dailyBox.create({ data: { userId: member.id } }));

    // Template embed
    const embed = new Embed()
        .setAuthor(`${ctx.member.displayName}'s Bounty`, ctx.member.user.displayAvatarURL())
        .setFooter(`Bounties remaining: ${dailyBox.steals - 1}`);

    const assignedBishop = F.randomValueInArray(districts); // prettier-ignore

    // Some dramatic waiting time
    const waitEmbed = new Embed(embed)
        .setDescription(
            `Thank you for reporting <@${user}> to the Dema Council for infractions against the laws of The Sacred Municipality of Dema.\n\nWe have people on the way to find and rehabilitate them under the tenets of Vialism.`
        )
        .addField("Assigned Bishop", `<:emoji:${assignedBishop.emoji}> ${assignedBishop.bishop}`)
        .setImage("https://thumbs.gfycat.com/ConcernedFrightenedArrowworm-max-1mb.gif");

    await ctx.send({ embeds: [waitEmbed.toJSON()] });

    await F.wait(10000);

    // If the other user has a block item, the steal/bounty is voided
    if (otherDailyBox.blocks > 0) {
        await prisma.$transaction([
            prisma.dailyBox.update({
                where: { userId: ctx.member.id },
                data: { steals: { decrement: 1 } }
            }),
            prisma.dailyBox.update({
                where: { userId: member.id },
                data: { blocks: { decrement: 1 } }
            })
        ]);

        const failedEmbed = new Embed(embed)
            .setDescription(`<@${user}>'s Jumpsuit successfully prevented the Bishops from finding them. Your bounty failed.`); // prettier-ignore

        await ctx.editReply({ embeds: [failedEmbed] });
    } else {
        await prisma.user.update({
            where: { id: ctx.member.id },
            data: {
                credits: { increment: BOUNTY_NUM_CREDITS },
                dailyBox: { update: { steals: { decrement: 1 } } }
            }
        });

        const winEmbed = new Embed(embed).setDescription(
            `<@${user}> was found by the Bishops and has been issued a violation order.\n\nIn reward for your service to The Sacred Municipality of Dema and your undying loyalty to Vialism, you have been rewarded \`${BOUNTY_NUM_CREDITS}\` credits.`
        );

        sendViolationNotice(member, {
            violation: "FailedPerimeterEscape",
            issuingBishop: assignedBishop.bishop
        });

        await ctx.editReply({ embeds: [winEmbed.toJSON()] });
    }
});

export default command;
