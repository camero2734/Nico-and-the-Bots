import { Snowflake } from "discord.js";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { Change, changes } from "./_consts";

const command = new SlashCommand(<const>{
    description: "Reverts changes",
    options: []
});

command.setHandler(async (ctx) => {
    for (const [roleId, change] of Object.entries(changes) as [Snowflake, Change][]) {
        const role = await ctx.guild.roles.fetch(roleId);
        if (!role) continue;

        await role.edit({ color: change.from });
    }
});

export default command;
