import {
  ContainerBuilder,
  DangerButtonBuilder,
  PrimaryButtonBuilder,
  SecondaryButtonBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SuccessButtonBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ButtonStyle,
  type GuildMember,
  type InteractionEditReplyOptions,
  MessageFlags,
  SeparatorSpacingSize,
} from "discord.js";
import { CommandError, NULL_CUSTOM_ID } from "../../Configuration/definitions";
import { MessageTools } from "../../Helpers";
import { sendViolationNotice } from "../../Helpers/dema-notice";
import F from "../../Helpers/funcs";
import { prisma, queries } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { CONTRABAND_WORDS, getColorRoleCategories } from "./shop.consts";

enum ActionTypes {
  View = 0,
  Purchase = 1,
}

const msgInt = new ManualEntrypoint();

const setSectionAccessoryButton = (
  section: SectionBuilder,
  style: ButtonStyle.Primary | ButtonStyle.Secondary | ButtonStyle.Danger,
  label: string,
  customId: string,
  disabled = false,
  emoji?: { name: string },
) => {
  if (style === ButtonStyle.Danger) {
    const button = new DangerButtonBuilder().setLabel(label).setCustomId(customId).setDisabled(disabled);
    if (emoji) button.setEmoji(emoji);
    section.setDangerButtonAccessory(button);
    return;
  }

  if (style === ButtonStyle.Secondary) {
    const button = new SecondaryButtonBuilder().setLabel(label).setCustomId(customId).setDisabled(disabled);
    if (emoji) button.setEmoji(emoji);
    section.setSecondaryButtonAccessory(button);
    return;
  }

  const button = new PrimaryButtonBuilder().setLabel(label).setCustomId(customId).setDisabled(disabled);
  if (emoji) button.setEmoji(emoji);
  section.setPrimaryButtonAccessory(button);
};

export const GenColorBtnId = msgInt.addInteractionListener("shopColorsBtn", [], async (ctx) => {
  await ctx.deferReply({ flags: MessageFlags.Ephemeral });

  const initialMsg = await generateMainMenuEmbed(ctx.member);
  await ctx.editReply(initialMsg);
});

// Main Menu
const genMainMenuId = msgInt.addInteractionListener("shopColorMenu", [], async (ctx) => {
  await ctx.deferUpdate();

  const initialMsg = await generateMainMenuEmbed(ctx.member);
  await ctx.editReply(initialMsg);
});

// Category submenu
const genSubmenuId = msgInt.addInteractionListener("shopColorSubmenu", ["categoryId"], async (ctx, args) => {
  const categories = getColorRoleCategories(ctx.guild.roles);
  const [name, category] = Object.entries(categories).find(([_id, data]) => data.id === args.categoryId) || [];
  if (!name || !category) return;

  await ctx.deferUpdate();

  const dbUser = await queries.findOrCreateUser(ctx.member.id, {
    colorRoles: true,
  });

  const container = new ContainerBuilder().setAccentColor(0xd07a21);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        "### <:gooddaydema:1226628716076204033> Good Day Dema® Discord Shop",
        `**${name}**`,
        `${category.description}`,
        "",
        `**Cost:** ${category.data.credits} credits`,
        "\n\n",
      ].join("\n"),
    ),
  );

  category.data.roles.forEach((role) => {
    const cantAfford = dbUser.credits < category.data.credits;
    const missingCredits = category.data.credits - dbUser.credits;
    const contraband = CONTRABAND_WORDS.some((w) => role.name.toLowerCase().includes(w));
    const ownsRole = dbUser.colorRoles.some((r) => r.roleId === role.id);

    const section = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`<@&${role.id}>\n`),
    );
    const defaultStyle = contraband ? ButtonStyle.Danger : ButtonStyle.Primary;

    setSectionAccessoryButton(
      section,
      cantAfford || ownsRole ? ButtonStyle.Secondary : defaultStyle,
      role.name + (cantAfford ? ` (${missingCredits} more credits)` : ""),
      !ownsRole ? genItemId({ itemId: role.id, action: `${ActionTypes.View}` }) : NULL_CUSTOM_ID(),
      cantAfford || ownsRole,
      contraband ? { name: "🩸" } : undefined,
    );

    container.addSectionComponents(section);
  });

  // We hit the max component limit if there are too many roles
  if (category.data.roles.length < 12) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "-# Any product purchased must have been approved by The Sacred Municipality of Dema. Under the terms established by DMA ORG, any unapproved items are considered contraband and violators will be referred to Dema Council.",
      ),
    );
  }

  const actionRow = MessageTools.allocateButtonsIntoRows([
    new DangerButtonBuilder().setLabel("Go back").setCustomId(genMainMenuId({})),
  ]);

  await ctx.editReply({ components: [container, ...actionRow] });
});

const genItemId = msgInt.addInteractionListener("shopColorItem", ["itemId", "action"], async (ctx, args) => {
  const actionType = +args.action;

  const categories = getColorRoleCategories(ctx.guild.roles);
  const [categoryName, category] =
    Object.entries(categories).find(([_, category]) => category.data.roles.some((r) => r.id === args.itemId)) || [];
  const role = category?.data.roles.find((r) => r.id === args.itemId);

  if (!categoryName || !category || !role) return;

  await ctx.deferUpdate();

  // Ensure user doesn't have role already
  const dbUser = await queries.findOrCreateUser(ctx.member.id, {
    colorRoles: true,
  });
  if (dbUser.colorRoles.some((r) => r.roleId === role.id)) throw new CommandError("You already have this role!");

  // Change some stuff if the item is contraband
  const contraband = CONTRABAND_WORDS.some((w) => role.name.toLowerCase().includes(w));
  let title = "Good Day Dema® Discord Shop";
  if (contraband) title = F.randomizeLetters(title);

  const container = new ContainerBuilder().setAccentColor(role.colors.primaryColor);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### <:gooddaydema:1226628716076204033> ${title}\n## ${role.name}\n`),
  );

  if (actionType === ActionTypes.View) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `${category.data.credits} credits`,
          `Your credits: ${dbUser.credits} → ${dbUser.credits - category.data.credits}`,
          "",
        ].join("\n"),
      ),
    );

    if (contraband) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "-# ⚠️ **WARNING**: This item has been identified as contraband by The Sacred Municipality of Dema. Good Day Dema® does not endorse this product and it has been flagged for take-down. For your own safety, you must leave.",
        ),
      );
    }

    const roleComponents = MessageTools.allocateButtonsIntoRows([
      new SuccessButtonBuilder().setLabel("Purchase").setCustomId(
        genItemId({
          action: `${ActionTypes.Purchase}`,
          itemId: args.itemId,
        }),
      ),
      new DangerButtonBuilder().setLabel("Go back").setCustomId(genSubmenuId({ categoryId: category.id })),
    ]);

    await ctx.editReply({ components: [container, ...roleComponents] });
  } else if (actionType === ActionTypes.Purchase) {
    // Purchase
    if (!category.data.purchasable(role.id, ctx.member, dbUser))
      throw new CommandError("You do not have enough credits to purchase this item");

    // Add role to user's color roles list
    if (ctx.member.roles.cache.some((r) => r.id === role.id)) throw new CommandError("You already have this role!");

    // Use transaction to ensure user receives role and has their credits deducted
    await prisma.$transaction([
      prisma.colorRole.create({
        data: {
          userId: ctx.user.id,
          roleId: role.id,
          amountPaid: category.data.credits,
        },
      }),
      prisma.user.update({
        where: { id: dbUser.id },
        data: { credits: { decrement: category.data.credits } },
      }),
    ]);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Success! You are now a proud owner of the ${role.name} role. Thank you for shopping with Good Day Dema®.`,
      ),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# **How do I "equip" this role?**\n-# To actually apply this role, simply use the \`/roles colors\` command. You may only have one color role applied at a time (but you can own as many as you want).`,
      ),
    );

    let sent = false;
    try {
      const dm = await ctx.member.createDM();
      dm.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
      sent = true;
    } catch (e) {
      ctx.log.set({ dm_failed: true });
      ctx.log.set({ dm_error: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# This receipt was${sent ? "" : " unable to be"} forwarded to your DMs. ${sent ? "" : "Please save a screenshot of this as proof of purchase in case any errors occur."}`,
        ),
      );

      await ctx.editReply({ components: [container] });
    }

    if (contraband) {
      sendViolationNotice(ctx.member, {
        violation: "PossessionOfContraband",
        data: role.name,
      });
    }
  }
});

async function generateMainMenuEmbed(member: GuildMember): Promise<InteractionEditReplyOptions> {
  const categories = getColorRoleCategories(member.guild.roles);

  const dbUser = await queries.findOrCreateUser(member.id);

  const container = new ContainerBuilder().setAccentColor(0xd07a21);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        "### <:gooddaydema:1226628716076204033> Good Day Dema® Discord Shop",
        "Welcome to the official Discord color role shop! Feel free to peruse the shop to add a little more... saturation.",
        "",
        "Choose one of the categories below. A submenu will open that allows you to purchase roles within that category.",
      ].join("\n"),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Large));

  Object.entries(categories).forEach(([label, item], idx) => {
    const roleMentions = item.data.roles.map((r) => `<@&${r.id}>`).join("\n");

    const section = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${label}\n-# ${item.data.credits} credits\n${item.description}\n\n${roleMentions}`,
      ),
    );

    const unlocked = item.data.unlockedFor(member, dbUser);
    const lockedLabel = unlocked
      ? `${idx + 1}. ${label}`
      : item.data.locked
        ? "Temporarily Unavailable"
        : `Level ${item.data.level}${item.data.requiresDE ? " & Torchbearers" : ""}`;

    setSectionAccessoryButton(
      section,
      unlocked ? ButtonStyle.Primary : ButtonStyle.Secondary,
      lockedLabel,
      unlocked ? genSubmenuId({ categoryId: item.id }) : NULL_CUSTOM_ID(),
      !unlocked,
      !unlocked ? { name: "🔒" } : undefined,
    );

    container.addSectionComponents(section);
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));
  });

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "-# Any product purchased must have been approved by The Sacred Municipality of Dema. Under the terms established by DMA ORG, any unapproved items are considered contraband and violators will be referred to Dema Council.",
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export default msgInt;
