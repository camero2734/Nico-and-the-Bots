import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

enum ActionTypes {
    Give,
    Remove
}

const command = new SlashCommand({
    description: "Creates a message that users can react to to receive a role",
    options: [
        {
            name: "text",
            description: "The description text for the embed",
            required: true,
            type: ApplicationCommandOptionType.String
        },
        {
            name: "role",
            description: "The role the interaction should give",
            required: true,
            type: ApplicationCommandOptionType.Role
        },
        {
            name: "channel",
            description: "The channel to send it in (defaults to current channel)",
            required: false,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();
    const { text, role } = ctx.opts;

    const roleObj = await ctx.channel.guild.roles.fetch(role);
    if (!roleObj) throw new CommandError("Invalid role given");

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel(`Get the ${roleObj.name} role`)
            .setCustomId(genActionId({ roleId: roleObj.id, action: `${ActionTypes.Give}` }))
            .setEmoji({
                name: "😎"
            }),
        new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setLabel(`Remove the ${roleObj.name} role`)
            .setCustomId(genActionId({ roleId: roleObj.id, action: `${ActionTypes.Remove}` }))
            .setEmoji({
                name: "😔"
            })
    ]);

    const embed = new EmbedBuilder()
        .setTitle("Role Giver™️") //
        .setDescription(`By clicking the buttons below, you can get/remove the ${roleObj.name} role.`)
        .addFields([{ name: "Description", value: text }])
        .addFields([{ name: "Role", value: `${roleObj}` }]);

    await ctx.send({ embeds: [embed], components: [actionRow] });
});

const genActionId = command.addInteractionListener("reactForRole", <const>["roleId", "action"], async (ctx, args) => {
    const roleId = args.roleId.toSnowflake();
    const action = +args.action;

    const role = await ctx.guild.roles.fetch(roleId);
    const highestRoleAllowed = await ctx.guild.roles.fetch(roles.muted);
    if (!role || !highestRoleAllowed) return;

    // Ensure this isn't giving away the staff role or anything
    if (role.position >= highestRoleAllowed.position) return;

    if (action === ActionTypes.Give) {
        await ctx.member.roles.add(role);
    } else if (action === ActionTypes.Remove) {
        await ctx.member.roles.remove(role);
    } else return;

    await ctx.followUp({
        embeds: [
            new EmbedBuilder({
                description: `The ${role} role was successfully ${action === ActionTypes.Give ? "added" : "removed"}`
            })
        ],
        ephemeral: true
    });
});

export default command;
