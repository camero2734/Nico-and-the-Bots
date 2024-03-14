import { Faker, en } from "@faker-js/faker";
import { Colors, EmbedBuilder } from "discord.js";
import { roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const loadingMessages = [
    "Verifying residency eligibility based on Dema's citizenship criteria",
    "Conducting assessments for integration into Dema's societal fabric",
    "Enhancing indoctrination procedures to ensure undying allegiance",
    "Fetching failed perimeter escape records to cross-check with your application",
    "Calculating the optimal district assignment based on your psychological profile",
    "Preparing propaganda materials for your arrival",
    "Checking DMAORG records for any outstanding cases, warrants, or sanctions",
    "Running your application by the Dema Council for final approval",
    "Validating your application against the Vialist Code of Conduct",
    "Ensuring all breaches are sealed and all exits are locked",
    "Bringing Keons back from the dead to sign off on your application",
    "Cross-checking DNA samples with Clancy's",
    "Scanning for presence of psychokinetic weapons",
    "Initializing tax collection procedures",
    "Asking Reisdro to bless your application",
    "Getting Listo to fix the application form",
    "Requesting a Vetomo Vibe Check",
    "Waiting for Nills to finish his coffee",
    "Waiting for Nico to... oh... nevermind... he's... busy.",
    "Asking Andre to stop playing the drums",
    "Printing your Dema ID card",
    "Planning airstrike on Voldsoy cove",
    "Painting the walls of your new home gray",
    "Tracking down every NED",
];

const command = new SlashCommand({
    description: "Receive your district assignment in DEMA",
    options: []
});

command.setHandler(async (ctx) => {
    if (!ctx.member.roles.cache.has(roles.staff)) throw new CommandError("This command is not available to you.");

    await ctx.deferReply({ ephemeral: true });

    // Make sure the user doesn't already have a district role
    const districtRoleIds = Object.values(roles.districts);
    const hasRole = ctx.member.roles.cache.find(r => (districtRoleIds as string[]).includes(r.id));
    if (hasRole) throw new CommandError(`You have already been assigned to ${hasRole.name.toUpperCase()}.`);

    // Assign a district role
    const faker = new Faker({ locale: [en] });
    faker.seed(F.hashToInt(`district:bishop:${ctx.user.id}`));
    const assignedRoleId = faker.helpers.arrayElement(districtRoleIds);
    const role = await ctx.guild.roles.fetch(assignedRoleId);
    if (!role) throw new CommandError("Invalid role");

    // Now have some fun -- pretend to think about it for a few seconds
    const embed = new EmbedBuilder()
        .setTitle("Digital Entry Management Assistant for Relocation (DEMA-R)")
        .setDescription("Thank you for choosing the Dema relocation program. We are now processing your application.")
        .setColor(Colors.Red);

    await ctx.editReply({ embeds: [embed] });

    const allMessages = faker.helpers.shuffle(loadingMessages).slice(0, 3);

    let newEmbed = new EmbedBuilder(embed.toJSON());
    for (let i = 0; i <= allMessages.length; i++) {
        await F.wait(1500);
        newEmbed = new EmbedBuilder(embed.toJSON());

        const pastMessages = allMessages.slice(0, i);
        const latestMessage = allMessages[i];

        for (const msg of pastMessages) {
            newEmbed.addFields({
                name: msg,
                value: "✅"
            });
        }

        if (latestMessage) {
            newEmbed.addFields({
                name: latestMessage,
                value: "..."
            });
        }

        await ctx.editReply({ embeds: [newEmbed] });
    }

    newEmbed.addFields({
        name: "\u200b",
        value: "Processing complete. Fetching district assignment..."
    });
    await ctx.editReply({ embeds: [newEmbed] });

    await F.wait(1500);

    const bishopName = Object.entries(roles.districts).find(x => x[1] === assignedRoleId)?.[0]?.toUpperCase();

    newEmbed
        .addFields({
            name: "<:bishop:860026157982547988> District Assignment",
            value: `You have been assigned to ${role.name.toUpperCase()}. ${bishopName} welcomes you to your new home.`
        });

    await ctx.member.roles.add(assignedRoleId);

    await ctx.editReply({ embeds: [newEmbed] });
});



export default command;
