import { channelIDs, userIDs } from "Configuration/config";
import { prisma } from "Helpers/prisma-init";
import { ApplicationCommandOptionType } from "discord.js";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

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

  const botChan = await ctx.guild.channels.fetch(channelIDs.bottest);
  if (!botChan || !botChan.isTextBased()) {
    return await ctx.editReply("Error occurred, please try again later.");
  }

  const role = ctx.guild.roles.cache.get(ctx.opts.role);
  if (!role) {
    return await ctx.editReply("The specified role does not exist in this server.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const userRole = await tx.colorRole.findFirst({
      where: {
        userId: ctx.user.id,
        roleId: ctx.opts.role,
        purchasedAt: { lt: new Date("2025-11-24") },
      },
    });

    if (!userRole) {
      return { success: false, message: "You are not eligible for a refund for that role." } as const;
    }

    await tx.colorRole.delete({
      where: {
        roleId_userId: {
          roleId: userRole.roleId,
          userId: userRole.userId,
        },
      },
    });

    await tx.user.update({
      where: { id: ctx.user.id },
      data: { credits: { increment: userRole.amountPaid } },
    });

    return { success: true, amountRefunded: userRole.amountPaid } as const;
  });

  if (!result.success) {
    return await ctx.editReply(result.message);
  } else {
    await ctx.editReply(`Successfully refunded ${result.amountRefunded} credits for ${role.name}`);
    await botChan.send({
      content: `${ctx.user.tag} (${ctx.user.id}) refunded ${result.amountRefunded} credits for the role ${role.name} (${role.id})`,
      allowedMentions: { parse: [] },
    });
  }
});

command.addAutocompleteListener("role", async (ctx) => {
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

  const options = mappedRoles.map(({ role, amountPaid }) => ({
    name: `${role.name} - ${amountPaid} credits`,
    value: role.id,
  }));

  await ctx.respond(options);
});

export default command;
