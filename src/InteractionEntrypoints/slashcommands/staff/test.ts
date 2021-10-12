import { guildID, roles } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    const channels = await ctx.guild.channels.fetch();

    for (const channel of channels.values()) {
        if (channel.type !== "GUILD_TEXT") continue;

        const channelPerms = channel.permissionsFor("335912315494989825");
        if (!channelPerms) continue;

        if (!channelPerms.has("USE_APPLICATION_COMMANDS")) {
            console.log(`#${channel.name}`);
            await channel.permissionOverwrites.edit(roles.banditos, { USE_APPLICATION_COMMANDS: null }).catch(console.log); // prettier-ignore
            await channel.permissionOverwrites.edit(guildID, { USE_APPLICATION_COMMANDS: null }).catch(console.log);
        }
    }
    await ctx.editReply({ content: "ok boomer" });
});

export default command;
