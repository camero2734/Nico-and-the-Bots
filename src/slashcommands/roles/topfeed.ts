import { CommandOptionType } from "slash-create";
import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import * as R from "ramda";
import F from "helpers/funcs";
import { roles } from "configuration/config";

const topfeedList = R.keys(roles.topfeed.selectable);
type OptsType = Record<typeof topfeedList[number], boolean>;

export const Options: CommandOptions = {
    description: "Gives you notification roles for topfeed channels (when someone posts on SM, DMAORG updates, etc.)",
    options: topfeedList.map((name) => ({
        name,
        description: `Enable or disable notifications for ${F.titleCase(name)}`,
        required: false,
        type: CommandOptionType.BOOLEAN
    }))
};

export const Executor: CommandRunner<OptsType> = async (ctx) => {
    const chosenRoles = F.entries(ctx.opts).filter((e) => e[1]); // Only want ones they selected True for
    const toGive = chosenRoles.map((e) => roles.topfeed.selectable[e[0]]); // Map to the role IDs

    const remove = R.difference(R.values(roles.topfeed.selectable), toGive);

    // Remove the roles the user didn't request
    await ctx.member.roles.remove(remove);

    // Add the roles they did
    await ctx.member.roles.add(toGive);

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.user.avatarURL)
        .setDescription(
            `Your topfeed roles have been updated to ${chosenRoles.map((c) => "`" + c[0] + "`").join(", ")}!`
        );

    await ctx.embed(embed);
};
