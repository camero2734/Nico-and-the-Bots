import { type APIComponentInContainer, ComponentType, MessageFlags, ContainerBuilder } from "discord.js";
import { MessageContextMenu } from "../../Structures/EntrypointContextMenu";

const ctxMenu = new MessageContextMenu("🔗 Get media URLs");

function findValuesByKeyRecursive(obj: unknown, keyToFind: string, results: Set<string>): void {
  if (typeof obj !== "object" || obj === null) {
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      findValuesByKeyRecursive(item, keyToFind, results);
    }
    return;
  }

  if (Object.prototype.hasOwnProperty.call(obj, keyToFind)) {
    const value = (obj as { [keyToFind]: unknown })[keyToFind];
    if (typeof value === "string") {
      results.add(value);
    }
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      findValuesByKeyRecursive((obj as { [key]: unknown })[key], keyToFind, results);
    }
  }
}

ctxMenu.setHandler(async (ctx, msg) => {
  if (!ctx.isMessageContextMenuCommand()) return;
  if (!ctx.member) throw new Error("Could not find member");

  // const content = msg.attachments.map((attachment) => attachment.proxyURL).join("\n");
  const results = new Set<string>();
  findValuesByKeyRecursive(msg.toJSON(), "proxyURL", results);

  const content = Array.from(results).join("\n");

  console.log("Creating dm");
  const dm = await ctx.user.createDM(true);

  console.log("Creating components");
  const components: APIComponentInContainer[] = [
    {
      type: ComponentType.TextDisplay,
      content: "## Media for message",
    },
    {
      type: ComponentType.TextDisplay,
      content: content || "No media found in this message.",
    },
  ];

  console.log("Forwarding message");
  await dm.send({
    content: "Hello",
  });
  const m = await msg.forward(dm);

  console.log("Replying with components");
  await m.reply({
    components: [
      new ContainerBuilder({
        components,
        accent_color: 0x5865f2,
      }),
    ],
    flags: MessageFlags.IsComponentsV2,
  });
});

export default ctxMenu;
