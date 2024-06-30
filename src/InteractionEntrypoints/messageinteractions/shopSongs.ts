/* eslint-disable @typescript-eslint/no-explicit-any */
import { ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, InteractionEditReplyOptions, italic } from "discord.js";
import { CommandError, NULL_CUSTOM_ID } from "../../Configuration/definitions";
import { MessageTools } from "../../Helpers";
import { sendViolationNotice } from "../../Helpers/dema-notice";
import F from "../../Helpers/funcs";
import { prisma, queries } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { CONTRABAND_WORDS, getSongRoleCategories } from "./shop.consts";
import { userIDs } from "../../Configuration/config";

enum ActionTypes {
    View,
    Purchase
}

const msgInt = new ManualEntrypoint();

export const GenSongBtnId = msgInt.addInteractionListener("shopSongsBtn", [], async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    if (ctx.member.id !== userIDs.me) throw new CommandError("This command is not available to you.");

    const initialMsg = await generateMainMenuEmbed(ctx.member);
    await ctx.editReply(initialMsg);
});

// Main Menu
const genMainMenuId = msgInt.addInteractionListener("songSongsMenu", [], async (ctx) => {
    await ctx.deferUpdate();

    const initialMsg = await generateMainMenuEmbed(ctx.member);
    await ctx.editReply(initialMsg);
});

// Category submenu
const genSubmenuId = msgInt.addInteractionListener("songSongsSubmenu", ["categoryId"], async (ctx, args) => {
    const categories = getSongRoleCategories(ctx.guild.roles);
    const [name, category] = Object.entries(categories).find(([_id, data]) => data.id === args.categoryId) || [];
    if (!name || !category) return;

    await ctx.deferUpdate();

    const dbUser = await queries.findOrCreateUser(ctx.member.id, { songRoles: true });

    const embed = new EmbedBuilder()
        .setAuthor({ name: "Good Day Dema® Discord Shop", iconURL: "https://i.redd.it/wd53naq96lr61.png" })
        .setTitle(name)
        .setColor(0xD07A21)
        .setDescription(`*${category.description}*\n`)
        .addFields([{ name: "Credits", value: `${category.data.credits}` }])
        .addFields([{ name: "\u200b", value: category.data.roles.map((r) => `<@&${r.id}>`).join("\n") + "\n\u2063" }])
        .setFooter({ text: "Any product purchased must have been approved by The Sacred Municipality of Dema. Under the terms established by DMA ORG, any unapproved items are considered contraband and violators will be referred to Dema Council." }); // prettier-ignore

    const cantAfford = dbUser.credits < category.data.credits;
    const missingCredits = category.data.credits - dbUser.credits;

    const rawComponents = category.data.roles.map((role) => {
        const contraband = CONTRABAND_WORDS.some((w) => role.name.toLowerCase().includes(w));
        const ownsRole = dbUser.songRoles.some((r) => r.roleId === role.id);
        const defaultStyle = contraband ? ButtonStyle.Danger : ButtonStyle.Primary;

        const builder = new ButtonBuilder()
            .setDisabled(cantAfford)
            .setStyle(cantAfford || ownsRole ? ButtonStyle.Secondary : defaultStyle)
            .setDisabled(cantAfford || ownsRole)
            .setLabel(role.name + (cantAfford ? ` (${missingCredits} more credits)` : ""))
            .setCustomId(
                !ownsRole ? genItemId({ itemId: role.id, action: `${ActionTypes.View}` }) : NULL_CUSTOM_ID()
            )
        if (contraband) builder.setEmoji({ name: "🩸" });
        return builder;
    });

    const components = MessageTools.allocateButtonsIntoRows([
        ...rawComponents,
        new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel("Go back").setCustomId(genMainMenuId({}))
    ]);

    await ctx.editReply({ embeds: [embed], components });
});

// Viewing a specific item
const genItemId = msgInt.addInteractionListener("songSongsItem", ["itemId", "action"], async (ctx, args) => {
    const actionType = +args.action;

    const categories = getSongRoleCategories(ctx.guild.roles);
    const [categoryName, category] =
        Object.entries(categories).find(([_, category]) => category.data.roles.some((r) => r.id === args.itemId)) || [];
    const role = category?.data.roles.find((r) => r.id === args.itemId);

    if (!categoryName || !category || !role) return;

    await ctx.deferUpdate();

    // Ensure user doesn't have role already
    const dbUser = await queries.findOrCreateUser(ctx.member.id, { songRoles: true });
    if (dbUser.songRoles.some((r) => r.roleId === role.id)) throw new CommandError("You already have this role!");

    // Change some stuff if the item is contraband
    const contraband = CONTRABAND_WORDS.some((w) => role.name.toLowerCase().includes(w));
    let title = "Good Day Dema® Discord Shop";
    if (contraband) title = F.randomizeLetters(title);
    const shopImage = contraband ? "https://i.imgur.com/eQEaugK.png" : "https://i.redd.it/wd53naq96lr61.png";
    const footer = contraband
        ? F.randomizeLetters("thEy mustn't know you were here. it's al l propaganda. no one should ever find out About this. you can never tell anyone about thiS -- for The sake of the others' survIval, you muSt keep this silent. it's al l propa ganda. we mUst keeP silent. no one can know. no one can know. no o ne c an kn ow_", 0.1) // prettier-ignore
        : "This product has been approved by The Sacred Municipality of Dema. Under the terms established by DMA ORG, any unapproved items are considered contraband and violators will be referred to Dema Council.";

    const embed = new EmbedBuilder()
        .setAuthor({ name: title, iconURL: shopImage })
        .setTitle(role.name)
        .setColor(role.color)
        .setFooter({ text: footer }); // prettier-ignore

    if (actionType === ActionTypes.View) {
        embed
            .setDescription(`Would you like to purchase this item?`)
            .addFields([{ name: "Cost", value: `${category.data.credits}`, inline: true }])
            .addFields([{
                name: "Your credits",
                value: `${dbUser.credits} → ${dbUser.credits - category.data.credits}`,
                inline: true
            }]);

        if (contraband) {
            embed.addFields([{
                name: "WARNING",
                value: "This item has been identified as contraband by The Sacred Municipality of Dema. Good Day Dema® does not endorse this product and it has been flagged for take-down. For your own safety, you must leave."
            }]);
        }

        const roleComponents = MessageTools.allocateButtonsIntoRows([
            new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel("Purchase")
                .setCustomId(genItemId({ action: `${ActionTypes.Purchase}`, itemId: args.itemId })),

            new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setLabel("Go back")
                .setCustomId(genSubmenuId({ categoryId: category.id }))
        ]);

        await ctx.editReply({ embeds: [embed], components: roleComponents });
    } else if (actionType === ActionTypes.Purchase) {
        // Purchase
        if (!category.data.purchasable(role.id, ctx.member, dbUser))
            throw new CommandError("You do not have enough credits to purchase this item");

        // Add role to user's song roles list
        if (ctx.member.roles.cache.some((r) => r.id === role.id)) throw new CommandError("You already have this role!");

        // Use transaction to ensure user receives role and has their credits deducted
        await prisma.$transaction([
            prisma.songRole.create({
                data: { userId: ctx.user.id, roleId: role.id, /** amountPaid: category.data.credits TODO */ }
            }),
            prisma.user.update({
                where: { id: dbUser.id },
                data: { credits: { decrement: category.data.credits } }
            })
        ]);

        embed
            .setDescription(
                `Success! You are now a proud owner of the ${role.name} role. Thank you for shopping with Good Day Dema®.`
            ) // prettier-ignore
            .addFields([{
                name: `How do I "equip" this role?`,
                value: "To actually apply this role, simply use the `/roles songs` command. You may only have one song role applied at a time (but you can own as many as you want)."
            }]);
        let sent = false;
        try {
            const dm = await ctx.member.createDM();
            dm.send({ embeds: [embed] });
            sent = true;
        } catch (e) {
            //
        } finally {
            embed.setFields([]);
            embed.setDescription(`${embed.data.description} This receipt was${sent ? "" : " unable to be"} forwarded to your DMs. ${sent ? "" : "Please save a screenshot of this as proof of purchase in case any errors occur."}`) // prettier-ignore

            await ctx.editReply({ embeds: [embed], components: [] });
        }

        if (contraband) {
            sendViolationNotice(ctx.member, {
                violation: "PossessionOfContraband",
                data: role.name
            });
        }
    }
});

async function generateMainMenuEmbed(member: GuildMember): Promise<InteractionEditReplyOptions> {
    const categories = getSongRoleCategories(member.guild.roles);

    const dbUser = await queries.findOrCreateUser(member.id);

    const MenuEmbed = new EmbedBuilder()
        .setAuthor({ name: "Good Day Dema® Discord Shop", iconURL: "https://i.redd.it/wd53naq96lr61.png" })
        .setColor(0xD07A21)
        .setDescription(
            [
                "Welcome to the official Discord song role shop! Feel free to peruse the shop to find your favorite song 🎶",
                "",
                "Choose one of the categories below. A submenu will open that allows you to purchase roles within that category.",
            ].join("\n")
        )
        .setFooter({ text: "Any product purchased must have been approved by The Sacred Municipality of Dema. Under the terms established by DMA ORG, any unapproved items are considered contraband and violators will be referred to Dema Council." }); // prettier-ignore

    const actionRows = MessageTools.allocateButtonsIntoRows(
        Object.entries(categories).map(([label, item], idx) => {
            const unlocked = item.data.unlockedFor(member, dbUser);
            const builder = new ButtonBuilder()
                .setStyle(unlocked ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setLabel(
                    unlocked
                        ? `${idx + 1}. ${label}`
                        : `Level ${item.data.level}${item.data.requiresDE ? ` & Firebreathers` : ""}`
                )
                .setCustomId(unlocked ? genSubmenuId({ categoryId: item.id }) : NULL_CUSTOM_ID());
            if (!unlocked) {
                builder.setDisabled(true);
                builder.setEmoji({ name: "🔒" });
            }

            return builder;
        })
    )

    for (const [name, item] of Object.entries(categories)) {
        MenuEmbed.addFields([{ name: name, value: `${italic(item.description)}\n` + item.data.roles.map((r) => `<@&${r.id}>`).join("\n") + "\n\u2063" }]);
    }

    return { embeds: [MenuEmbed], components: actionRows };
}

export default msgInt;
