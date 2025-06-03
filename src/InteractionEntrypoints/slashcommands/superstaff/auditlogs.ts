import { AttachmentBuilder, AuditLogEvent } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
  description: "Audit logs",
  options: [],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  if (ctx.user.id !== userIDs.me) throw new CommandError("You cannot use this command");

  // 26 May 2025
  const date = new Date("2025-05-26T00:00:00Z");

  const usersWithRole = new Set<string>();

  let lastId: string | undefined;

  outer: for (let i = 0; i < 100; i++) {
    console.log(`Fetching audit logs, iteration ${i + 1}`);
    const logs = await ctx.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberRoleUpdate,
      limit: 100,
      before: lastId,
    });

    if (logs.entries.size === 0) break;

    for (const entry of logs.entries.values()) {
      if (!entry.targetId) continue;
      if (entry.createdAt < date) {
        console.log("Reached logs before the specified date, stopping.");
        break outer;
      }

      if (
        entry.changes.some(
          (change) => change.key === "$add" && change.new?.map((x) => x.id).includes("1373674037204484167"),
        )
      ) {
        usersWithRole.add(entry.targetId);
      }

      if (
        entry.changes.some(
          (change) => change.key === "$add" && change.new?.map((x) => x.id).includes("1373724238695108761"),
        )
      ) {
        usersWithRole.add(entry.targetId);
      }

      lastId = entry.id;
    }
  }

  const txtFile = Buffer.from([...usersWithRole.values()].join("\n"), "utf-8");
  const fileName = `users-with-role-${Date.now().toString()}.txt`;

  await ctx.editReply({
    content: `Found ${usersWithRole.size} users with the role.`,
    files: [new AttachmentBuilder(txtFile, { name: fileName })],
  });
});

export default command;
