import { Colors, EmbedBuilder } from "discord.js";
import { roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { Faker, en } from "@faker-js/faker";

const loadingMessages = [
    "Verifying residency eligibility based on Dema's citizenship criteria",
    "Conducting assessments for integration into Dema's societal fabric",
    "Enhancing indoctrination procedures to ensure undying allegiance to Vialism",
    "Fetching failed perimeter escape records to cross-check with your application",
];

const command = new SlashCommand({
    description: "Receive your district assignment in DEMA",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) throw new CommandError("This command is not available to you.");

    await ctx.deferReply({ ephemeral: true });

    // Make sure the user doesn't already have a district role
    const districtRoleIds = Object.values(roles.districts);
    const hasRole = ctx.member.roles.cache.find(r => (districtRoleIds as string[]).includes(r.id));
    if (hasRole) throw new CommandError(`You have already been assigned to ${hasRole.name.toUpperCase()}.`);

    // Assign a district role
    const faker = new Faker({ locale: [en] });
    faker.seed(F.hashToInt(`district:${ctx.user.id}`));
    const assignedRoleId = faker.helpers.arrayElement(districtRoleIds);
    const role = await ctx.guild.roles.fetch(assignedRoleId);
    if (!role) throw new CommandError("Invalid role");

    // Now have some fun -- pretend to think about it for a few seconds
    const embed = new EmbedBuilder()
        .setTitle("Digital Entry Management Assistant Relocation (DEMA-R) program")
        .setDescription("Thank you for choosing the Dema relocation program. We are now processing your application.")
        .setColor(Colors.Red);

    await ctx.editReply({ embeds: [embed] });

    const displayedMessages = faker.helpers.shuffle(loadingMessages).slice(0, 3);

    for (const msg of displayedMessages) {
        await F.wait(300);
        embed.addFields({
            name: msg,
            value: "..."
        });

        await ctx.editReply({ embeds: [embed] });
    }

    await F.wait(1000);

    const bishopName = Object.entries(roles.districts).find(x => x[1] === assignedRoleId)?.[0]?.toUpperCase();

    const finalEmbed = new EmbedBuilder()
        .setTitle("Digital Entry Management Assistant Relocation (DEMA-R) program")
        .setDescription("Your application has been processed.")
        .setColor(Colors.Red)
        .addFields({
            name: "District Assignment",
            value: `You have been assigned to ${role.name.toUpperCase()}. ${bishopName} welcomes you to your new home.`
        });

    await ctx.editReply({ embeds: [finalEmbed] });
});



export default command;
