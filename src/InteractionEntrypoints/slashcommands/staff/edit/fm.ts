import { ActionRowBuilder, ApplicationCommandOptionType, ModalBuilder, TextInputBuilder, TextInputStyle, userMention } from "discord.js";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";

const MIGRATE_MODAL_USERNAME = "fmMigrateModal";

const command = new SlashCommand({
    description: "Edits a user's FM integration",
    options: [
        {
            name: "user",
            description: "The user to modify",
            required: true,
            type: ApplicationCommandOptionType.User
        },
        {
            name: "action",
            description: "The action to perform",
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: "Migrate", value: "MIGRATE_USERNAME" }
            ]
        }
    ]
});

command.setHandler(async (ctx) => {
    const { user, action } = ctx.opts;

    if (action === "MIGRATE_USERNAME") {
        const modal = new ModalBuilder()
            .setCustomId(genMigrateModalId({ userId: user }))
            .setTitle("Modify FM Integration");

        const usernameInputRow = new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
                .setCustomId(MIGRATE_MODAL_USERNAME)
                .setLabel("Enter the new last.fm username")
                .setPlaceholder("NOTE: This will delete the username from any other users")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        );

        // Add inputs to the modal
        modal.setComponents(usernameInputRow);

        await ctx.showModal(modal);
    }
});

const genMigrateModalId = command.addInteractionListener("fmMigrateModal", ["userId"], async (ctx, args) => {
    await ctx.deferReply();

    if (!ctx.isModalSubmit()) throw new Error("Invalid interaction type");

    const user = await ctx.guild.members.fetch(args.userId);
    if (!user) throw new Error("Could not find user");

    const fmUsername = ctx.fields.getTextInputValue(MIGRATE_MODAL_USERNAME);

    // Remove fm from any other users
    await prisma.userLastFM.deleteMany({ where: { username: fmUsername } });

    await prisma.userLastFM.upsert({
        where: { userId: user.id },
        create: { username: fmUsername, userId: user.id },
        update: { username: fmUsername }
    });

    await ctx.editReply({ content: `Successfully migrated ${userMention(user.id)}'s FM username to ${fmUsername}` });
});

export default command;
