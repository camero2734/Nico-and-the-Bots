import { CommandOptionType, ComponentActionRow } from "slash-create";
import { CommandComponentListener, CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import {
    EmojiIdentifierResolvable,
    GuildMember,
    Message,
    MessageActionRow,
    MessageEmbed,
    MessageSelectMenu,
    Snowflake
} from "discord.js";
import * as R from "ramda";
import F from "helpers/funcs";
import { roles, userIDs } from "configuration/config";
import { MessageContext } from "helpers";

export const Options: CommandOptions = {
    description: "Gives you notification roles for topfeed channels (when someone posts on SM, DMAORG updates, etc.)",
    options: [
        {
            name: "removeall",
            description: "Removes all your topfeed roles",
            type: CommandOptionType.BOOLEAN,
            required: false
        }
    ]
};

const tf = roles.topfeed.selectable;
const emojiMap: Record<typeof tf[keyof typeof tf], Snowflake> = {
    [tf.tyler]: "331910425576996864",
    [tf.josh]: "537470356609302531",
    [tf.band]: "832772733002973195",
    [tf.dmaorg]: "404458118299254785",
    [tf.jenna]: "802951666345181235",
    [tf.debby]: "699004652481544194",
    [tf.interviews]: "441115791509684235",
    [tf.jim]: "587034603714379788",
    [tf.other]: "694781760407601233"
};

const answerListener = new CommandComponentListener("topfeedChoose", []);
export const ComponentListeners: CommandComponentListener[] = [answerListener];

export const Executor: CommandRunner<{ removeall?: boolean }> = async (ctx) => {
    if (ctx.user.id !== userIDs.me) throw new CommandError("This command is under construction");

    if (ctx.opts.removeall) {
        for (const role of Object.values(tf)) {
            await ctx.member.roles.remove(role);
        }
        await ctx.member.roles.remove(roles.topfeed.divider);
        return ctx.send({ embeds: [new MessageEmbed().setDescription("All your roles have been removed.").toJSON()] });
    }

    const options = Object.entries(roles.topfeed.selectable);
    const menu = new MessageSelectMenu()
        .addOptions(
            options.map(([roleName, roleID]) => ({
                label: roleName,
                description: `Enable notifications for ${roleName}`,
                value: roleID,
                emoji: { id: emojiMap[roleID] } as EmojiIdentifierResolvable
            }))
        )
        .setPlaceholder("Select the topfeed role(s) you want")
        .setMinValues(0)
        .setMaxValues(options.length)
        .setCustomID(answerListener.generateCustomID({}));

    const actionRow = new MessageActionRow().addComponents(menu).toJSON() as ComponentActionRow;

    const embed = new MessageEmbed().setDescription(
        "Select your topfeed roles below. You will receive a ping when the channel receives an update."
    );

    await ctx.send({
        components: [actionRow],
        embeds: [embed.toJSON()]
    });
};

answerListener.handler = async (interaction) => {
    if (!interaction.isSelectMenu() || !interaction.member) return;

    const member = interaction.member as GuildMember;

    const selected = interaction.values;
    if (!Array.isArray(selected) || selected.length < 1) return;

    const allRoles: Snowflake[] = Object.values(tf);
    const hasRoles = member.roles.cache.array().filter((r) => allRoles.includes(r.id));

    // Remove old roles first
    for (const role of hasRoles) {
        await member.roles.remove(role);
    }

    // Add new roles
    for (const role of selected) {
        await member.roles.add(role);
    }

    // Add divider
    await member.roles.add(roles.topfeed.divider);

    const text = `You now have the following topfeed roles:\n${selected.map((s) => `<@&${s}>`).join(" ")}`;

    interaction.deferred = true;
    await interaction.editReply({ embeds: [new MessageEmbed().setDescription(text)], components: [] });
};
