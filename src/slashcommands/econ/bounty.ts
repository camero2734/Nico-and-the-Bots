import { createCanvas, loadImage } from "canvas";
import { channelIDs, roles, userIDs } from "configuration/config";
import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Economy } from "database/entities/Economy";
import { Item } from "database/entities/Item";
import { GuildMember, MessageAttachment, MessageEmbed, Snowflake } from "discord.js";
import { CommandOptionType } from "slash-create";
import { sendViolationNotice } from "../../helpers/dema-notice";
import F from "../../helpers/funcs";
import { districts } from "./resupply";

const NUM_CREDITS = 1000;

export const Options: CommandOptions = {
    description: "Reaps bounty by reporting a user to the Dema Council. Displays inventory if no user specified.",
    options: [
        {
            name: "user",
            description: "The user the bounty is on, who receives a violation notice if caught by the Bishops.",
            type: CommandOptionType.USER,
            required: false
        }
    ]
};

export const Executor: CommandRunner<{ user?: Snowflake }> = async (ctx) => {
    const user = ctx.opts.user;
    const isInventoryCmd = !user;

    await ctx.defer(isInventoryCmd);

    const userEconomy =
        (await ctx.connection.getRepository(Economy).findOne({ userid: ctx.member.id })) ||
        new Economy({ userid: ctx.member.id });

    if (isInventoryCmd) {
        const { steals, blocks } = userEconomy.dailyBox;

        const embed = new MessageEmbed()
            .setTitle("Your inventory")
            .addField("📑 Bounties", `${steals} bount${steals === 1 ? "y" : "ies"} available`, true)
            .addField(
                "<:jumpsuit:860724950070984735> Jumpsuits",
                `${blocks} jumpsuit${blocks === 1 ? "" : "s"} available`,
                true
            )
            .addField("Current bounty value", `${NUM_CREDITS} credits`)
            .setFooter(
                "You can use a bounty by mentioning the user in the command. You will recieve the bounty amount if successful. A jumpsuit is automatically used to protect you from being caught when a bounty is enacted against you."
            );

        await ctx.send({ embeds: [embed.toJSON()] });
        return;
    }

    // Perform some checks
    if (user === userIDs.me) throw new CommandError(`The Dema Council has no interest in prosecuting <@${userIDs.me}>.`); // prettier-ignore
    if (userEconomy.dailyBox.steals < 1) throw new CommandError("You have no bounties to use. Try to get some by using `/econ resupply`."); // prettier-ignore

    const member = await ctx.member.guild.members.fetch(user);
    if (!member || member.user.bot) throw new CommandError(`${member.displayName} investigated himself and found no wrong-doing. Case closed.`); // prettier-ignore

    const otherEconomy = (await ctx.connection.getRepository(Economy).findOne({ userid: user })) || new Economy({ userid: user }); // prettier-ignore

    // Consume bounty item
    userEconomy.dailyBox.steals--;

    // Template embed
    const embed = new MessageEmbed()
        .setAuthor(`${ctx.member.displayName}'s Bounty`, ctx.member.user.displayAvatarURL())
        .setFooter(`Bounties remaining: ${userEconomy.dailyBox.steals}`);

    const assignedBishop = F.randomValueInArray(districts); // prettier-ignore

    // Some dramatic waiting time
    const waitEmbed = new MessageEmbed(embed)
        .setDescription(
            `Thank you for reporting <@${user}> to the Dema Council for infractions against the laws of The Sacred Municipality of Dema.\n\nWe have people on the way to find and rehabilitate them under the tenets of Vialism.`
        )
        .addField("Assigned Bishop", `<:emoji:${assignedBishop.emoji}> ${assignedBishop.bishop}`)
        .setImage("https://thumbs.gfycat.com/ConcernedFrightenedArrowworm-max-1mb.gif");

    await ctx.send({ embeds: [waitEmbed.toJSON()] });

    await F.wait(10000);

    // If the other user has a block item, the steal/bounty is voided
    if (otherEconomy.dailyBox.blocks > 0) {
        otherEconomy.dailyBox.blocks--;

        const failedEmbed = new MessageEmbed(embed)
            .setDescription(`<@${user}>'s Jumpsuit successfully prevented the Bishops from finding them. Your bounty failed.`); // prettier-ignore

        await ctx.editOriginal({ embeds: [failedEmbed.toJSON()] });
    } else {
        userEconomy.credits += NUM_CREDITS;

        const winEmbed = new MessageEmbed(embed).setDescription(
            `<@${user}> was found by the Bishops and has been issued a violation order.\n\nIn reward for your service to The Sacred Municipality of Dema and your undying loyalty to Vialism, you have been rewarded \`${NUM_CREDITS}\` credits.`
        );

        sendViolationNotice(member, ctx.connection, {
            identifiedAs: "FAILED PERIMETER ESCAPE",
            found: "",
            issuingBishop: assignedBishop.bishop,
            reason: ""
        });

        await ctx.editOriginal({ embeds: [winEmbed.toJSON()] });
    }

    await ctx.connection.manager.save([userEconomy, otherEconomy]);
};
