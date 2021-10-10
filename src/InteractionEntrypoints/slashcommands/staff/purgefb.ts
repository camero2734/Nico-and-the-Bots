import { roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Removes all firebreathers",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    if (ctx.user.id !== userIDs.me) throw new CommandError("You cannot use this command");

    await ctx.guild.members.fetch();

    const fbRole = await ctx.guild.roles.fetch(roles.deatheaters);
    const formerFbRole = await ctx.guild.roles.fetch(roles.formerde);
    if (!fbRole || !formerFbRole) throw new CommandError("Role not found");

    await ctx.editReply(`Removing all members... (${fbRole.members.size})`);

    for (const member of fbRole.members.values()) {
        await member.roles.remove(fbRole);
        await member.roles.add(formerFbRole);
        await F.wait(500);
    }

    await ctx.editReply("Done");
});

export default command;
