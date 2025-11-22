import { prisma } from "Helpers/prisma-init";
import { ApplicationCommandOptionType } from "discord.js";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { userIDs } from "Configuration/config";

const rolesAvailableForRefundList = [
  "557303116941361183", // Bandito Green
  "557303189976907788", // Jumpsuit Green
  "557303097248972801", // Vulture Brown
  "558091802813399077", // The Red and the Go
  "557303295513985024", // Pet Cheetah Purple
  "557303359489703966", // March to the Cyan
];

const command = new SlashCommand({
  description: "Refunds an eligible color role purchased before the new color roles",
  options: [
    {
      name: "role",
      description: "The role to refund",
      required: true,
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
    },
  ],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply({ ephemeral: true });

  await ctx.editReply({
    content: `You selected <@&${ctx.opts.role}>`,
    allowedMentions: { parse: [] },
  });
});

command.addAutocompleteListener("role", async (ctx) => {
  const startTime = ctx.createdAt.getTime();

  if (ctx.user.id !== userIDs.me) {
    return await ctx.respond([]);
  }
  const userRoles = await prisma.colorRole.findMany({
    where: {
      userId: ctx.user.id,
      roleId: { in: rolesAvailableForRefundList },
      purchasedAt: { lt: new Date("2025-11-24") },
    },
    select: { roleId: true, amountPaid: true },
    orderBy: { roleId: "asc" },
  });

  const mappedRoles = userRoles
    .map((ur) => {
      const role = ctx.guild.roles.cache.get(ur.roleId);
      if (!role) throw new Error(`Role with ID ${ur.roleId} not found`);
      return { role, amountPaid: ur.amountPaid };
    })
    .filter(({ role }) => role.name.toLowerCase().includes(ctx.opts.role.toLowerCase()));

  const endTime = Date.now();
  const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);
  const options = mappedRoles.map(({ role, amountPaid }) => ({
    name: `${role.name} - ${amountPaid} credits (${elapsedSeconds}s)`,
    value: role.id,
  }));

  await ctx.respond(options);
});

export default command;
