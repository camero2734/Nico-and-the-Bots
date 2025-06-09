import {
  type APIComponentInContainer,
  ComponentType,
  MessageFlags,
  ContainerBuilder,
  type AnyComponent,
} from "discord.js";
import { MessageContextMenu } from "../../Structures/EntrypointContextMenu";

const ctxMenu = new MessageContextMenu("🔗 Get media URLs");

function visitAllComponents(component: AnyComponent, visitor: (c: AnyComponent) => void): void {
  visitor(component);

  if (component.type === ComponentType.ActionRow) {
    for (const child of component.components) {
      visitAllComponents(child, visitor);
    }
  } else if (component.type === ComponentType.Section) {
    visitor(component.accessory);
    if (!Array.isArray(component.components)) return;

    for (const child of component.components) {
      visitAllComponents(child, visitor);
    }
  } else if (component.type === ComponentType.Container) {
    for (const child of component.components) {
      visitAllComponents(child, visitor);
    }
  }
}

ctxMenu.setHandler(async (ctx, msg) => {
  if (!ctx.isMessageContextMenuCommand()) return;
  if (!ctx.member) throw new Error("Could not find member");

  const urls = new Set<string>();
  // Attachments
  for (const attachment of msg.attachments.values()) {
    if (attachment.proxyURL) {
      urls.add(attachment.proxyURL);
    }
  }

  // Embeds
  for (const embed of msg.embeds) {
    if (embed.footer?.proxyIconURL) {
      urls.add(embed.footer.proxyIconURL);
    }
    if (embed.thumbnail?.proxyURL) {
      urls.add(embed.thumbnail.proxyURL);
    }
    if (embed.image?.proxyURL) {
      urls.add(embed.image.proxyURL);
    }
    if (embed.video?.proxyURL) {
      urls.add(embed.video.proxyURL);
    }
    if (embed.author?.proxyIconURL) {
      urls.add(embed.author.proxyIconURL);
    }
  }

  // Components
  for (const component of msg.components) {
    visitAllComponents(component.toJSON(), (c) => {
      if (c.type === ComponentType.MediaGallery) {
        for (const media of c.items) {
          if (media.media.proxy_url) urls.add(media.media.proxy_url);
        }
      } else if (c.type === ComponentType.Thumbnail) {
        if (c.media?.proxy_url) urls.add(c.media.proxy_url);
      } else if (c.type === ComponentType.File) {
        if (c.file.proxy_url) urls.add(c.file.proxy_url);
      }
    });
  }

  const content = Array.from(urls).join("\n\n");

  const dm = await ctx.user.createDM(true);

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
