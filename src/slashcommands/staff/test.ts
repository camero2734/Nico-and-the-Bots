import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageAttachment, MessageEmbed, Snowflake } from "discord.js";
import { sendViolationNotice } from "helpers/dema-notice";
import F from "helpers/funcs";
import fetch from "node-fetch";
import R from "ramda";

export const Options: CommandOptions = {
    description: "Test command",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    const member = await ctx.member.guild.members.fetch("298244234912333824");
    sendViolationNotice(ctx.member, ctx.channel, ctx.connection, {
        identifiedAs: "POSSESSION OF ILLEGAL CONTRABAND",
        reason: "Possession of BANDITO GREEN",
        mainBody:
            "You are in volation with the laws set forth by DMA ORG and The Sacred Municipality of Dema. You were found in possession of regulated materials that have been outlawed by the Dema Council. Further actions will be taken to ensure these violations will not occur again."
    });
    await ctx.delete();
};
