import { type APIComponentInContainer, ComponentType, MessageFlags, ContainerBuilder } from "discord.js";
import { MessageContextMenu } from "../../Structures/EntrypointContextMenu";

const ctxMenu = new MessageContextMenu("🔗 Get media URLs");

ctxMenu.setHandler(async (ctx, msg) => {
  if (!ctx.isMessageContextMenuCommand()) return;
  if (!msg.member) throw new Error("Could not find member");

  const content = msg.attachments.map((attachment) => attachment.proxyURL).join("\n");

  const dm = await msg.member.createDM();

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

  const m = await msg.forward(dm);
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
