import { ActionRowBuilder, EmbedBuilder, SelectMenuComponent, SelectMenuOption, Snowflake } from "discord.js";
import * as R from "ramda";
import { channelIDs, roles } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Sends a message that allows you to select pronoun roles",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });
    const selectMenu = new SelectMenuComponent()
        .setCustomId(genSelectId({}))
        .setMaxValues(Object.keys(roles.pronouns).length)
        .setPlaceholder("Select your pronoun role(s) from the list")
        .addOptions(
            ...Object.entries(roles.pronouns).map(([name, id]) => new SelectMenuOption({ label: name, value: id }))
        );

    const selectEmbed = new EmbedBuilder()
        .setTitle("Select your pronoun role(s)")
        .setDescription(
            `You may select multiple. Don't see yours? Head over to <#${channelIDs.suggestions}> to suggest it!`
        );

    const actionRow = new ActionRowBuilder().setComponents(selectMenu);

    await ctx.editReply({ embeds: [selectEmbed], components: [actionRow] });
});

const genSelectId = command.addInteractionListener("pronounRoleSelect", <const>[], async (ctx) => {
    if (!ctx.isSelectMenu()) return;

    await ctx.deferUpdate();

    const rolesSelected = ctx.values as Snowflake[];
    if (rolesSelected.length === 0) return;

    // Remove any pronoun roles not mentioned
    const toRemove = R.difference(Object.values(roles.pronouns), rolesSelected);
    for (const r of toRemove) await ctx.member.roles.remove(r);

    // Give the pronoun roles mentioned
    for (const r of rolesSelected) await ctx.member.roles.add(r);

    const embed = new EmbedBuilder()
        .setAuthor({ name: ctx.member.displayName, iconURL: ctx.user.displayAvatarURL() })
        .setDescription(`Your pronoun roles have been updated!`);

    await ctx.editReply({ embeds: [embed], components: [] });
});

export default command;
