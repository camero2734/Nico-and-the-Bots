import {
    EmojiIdentifierResolvable,
    GuildMember,
    MessageActionRow,
    MessageEmbed,
    MessageSelectMenu,
    Snowflake
} from "discord.js";
import { roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

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

const command = new SlashCommand(<const>{
    description: "Gives you notification roles for topfeed channels (when someone posts on SM, DMAORG updates, etc.)",
    options: [
        {
            name: "removeall",
            description: "Removes all your topfeed roles",
            type: "BOOLEAN",
            required: false
        }
    ]
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) throw new CommandError("This command is under construction");

    await ctx.deferReply({ ephemeral: true });

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
        .setCustomId(genChoiceId({}));

    const actionRow = new MessageActionRow().addComponents(menu);

    const embed = new MessageEmbed().setDescription(
        "Select your topfeed roles below. You will receive a ping when the channel receives an update."
    );

    await ctx.send({
        components: [actionRow],
        embeds: [embed]
    });
});

const genChoiceId = command.addInteractionListener("topfeedChoose", [], async (ctx) => {
    if (!ctx.isSelectMenu() || !ctx.member) return;

    const member = ctx.member as GuildMember;

    const selected = ctx.values as Snowflake[];
    if (!Array.isArray(selected) || selected.length < 1) return;

    const allRoles: Snowflake[] = Object.values(tf);
    const hasRoles = [...member.roles.cache.values()].filter((r) => allRoles.includes(r.id));

    // Remove old roles first
    await member.roles.remove(hasRoles);

    // Add new roles
    await member.roles.add(selected);

    // Add divider
    await member.roles.add(roles.topfeed.divider);

    const text = `You now have the following topfeed roles:\n${selected.map((s) => `<@&${s}>`).join(" ")}`;

    ctx.deferred = true;
    await ctx.editReply({ embeds: [new MessageEmbed().setDescription(text)], components: [] });
});

export default command;
