import { Snowflake } from "discord.js";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { Change, changes } from "./_consts";

const command = new SlashCommand({
	description: "Reverts changes",
	options: [],
});

command.setHandler(async (ctx) => {
	await ctx.deferReply();
	for (const [roleId, change] of Object.entries(changes) as [
		Snowflake,
		Change,
	][]) {
		const role = await ctx.guild.roles.fetch(roleId);
		if (!role) continue;

		await role.edit({ color: change.from });
	}
	await ctx.editReply("Done");
});

export default command;
