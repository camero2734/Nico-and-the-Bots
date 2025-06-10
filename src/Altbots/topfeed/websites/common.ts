import {
  type APIComponentInContainer,
  ContainerBuilder,
  ComponentType,
  roleMention,
  AttachmentBuilder,
  ButtonStyle,
} from "discord.js";
import type { BasicDataForWebsite } from "./orchestrator";
import F from "../../../Helpers/funcs";
import topfeedBot from "../topfeed";
import { Schema } from "effect";

export const WebsiteDataSchema = Schema.Struct({
  hash: Schema.optional(Schema.String),
  html: Schema.optional(Schema.String),
  headers: Schema.optional(Schema.String),
});

export const createMessageComponents = async (
  data: BasicDataForWebsite,
  contentType: "HTML" | "HEADERS",
  newContent: string,
  diff: string,
) => {
  const role = await topfeedBot.guild.roles.fetch(data.roleId);
  if (!role) throw new Error(`Role with ID ${data.roleId} not found`);

  const fetchedAt = new Date();

  const file = new AttachmentBuilder(Buffer.from(newContent), {
    name: `${data.displayName.replace(/\s+/g, "_").toLowerCase()}_${contentType.toLowerCase()}_${fetchedAt.getTime()}.${contentType === "HTML" ? "html" : "txt"}`,
    description: `${contentType} content of the website as of ${fetchedAt.toISOString()}`,
  });

  const mainSection: APIComponentInContainer[] = [
    {
      type: ComponentType.TextDisplay,
      content: `# ${data.displayName} updated`,
    },
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          style: ButtonStyle.Link,
          label: "View Live Site",
          url: data.url,
        },
      ],
    },
    {
      type: ComponentType.TextDisplay,
      content: `## Diff\n\`\`\`diff\n${diff.substring(0, 1850)}\n\`\`\``,
    },
  ];

  const attachmentsSection: APIComponentInContainer[] = [
    {
      type: ComponentType.File,
      file: {
        url: `attachment://${file.name}`,
      },
    },
  ];

  const footerSection: APIComponentInContainer[] = [
    {
      type: ComponentType.TextDisplay,
      content: `-# ${roleMention(data.roleId)} | ${contentType} Updated ${F.discordTimestamp(fetchedAt, "relative")}`,
    },
  ];

  const container = new ContainerBuilder({
    components: [...mainSection, ...attachmentsSection, ...footerSection],
    accent_color: role.color,
  });

  return { container, file };
};
