import { Command, CommandError, CommandMessage, InteractiveError } from "configuration/definitions";
import { Item } from "database/entities/Item";
import { MessageEmbed } from "discord.js";
import { Connection, FindConditions, LessThanOrEqual, Not } from "typeorm";

export enum SuggestionStatus {
    Submitted,
    Planned,
    Unclear,
    "Not Planned",
    Completed
}

export type SuggestionStatusArray = Record<SuggestionStatus, string>;

const ITEM_FILTER: FindConditions<Item> = {
    type: "Suggestion",
    data: LessThanOrEqual(SuggestionStatus.Planned.toString())
};
const STATUS_COLORS: SuggestionStatusArray = ["#eeeeee", "#006600", "#eeff00", "#ff0000", "#00ff00"];

export default new Command({
    name: "viewsuggestions",
    aliases: ["viewsuggestion", "s"],
    description: "Views submitted suggestions",
    category: "Staff",
    usage: "!viewsuggestions [suggestion #]",
    example: "!viewsuggestions 42",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        const suggestionCount = await connection.getRepository(Item).count({ where: ITEM_FILTER });

        if (!msg.args || msg.args.length < 1) {
            throw new CommandError(`Enter a valid suggestion # (1-${suggestionCount})`);
        }

        const suggestionNum = parseInt(msg.args[0]);
        if (suggestionNum <= 0) throw new CommandError("Suggestion # must be positive");
        if (suggestionNum > suggestionCount) throw new CommandError(`There are only ${suggestionCount} suggestions.`);

        const [suggestion] =
            (await connection.getRepository(Item).find({ where: ITEM_FILTER, skip: suggestionNum - 1, take: 1 })) || [];

        if (!suggestion) throw new Error("Unable to find suggestion");

        const member = await msg.guild.members.fetch(suggestion.id);
        const status = parseInt(suggestion.data || "0") as SuggestionStatus;

        const embed = new MessageEmbed()
            .setAuthor(
                `Suggestion from ${member.displayName} (#${suggestionNum}/${suggestionCount})`,
                member.user.displayAvatarURL()
            )
            .setDescription(suggestion.title)
            .setFooter(`React 🏁 completed, ✅ planned, ⚠ unclear, ❌ not planned | ${new Date(suggestion.time)}`)
            .setColor(STATUS_COLORS[status]);

        const m = await msg.channel.send(embed);

        const reactions: string[] = status === SuggestionStatus.Submitted ? ["🏁", "✅", "⚠️", "❌"] : ["🏁"];

        for (const r of reactions) {
            await m.react(r);
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    },
    async interactive(msg, connection, reaction) {
        /** VERIFY INTERACTION BELONGS TO MESSAGE */
        const cmd = <Command>this;

        const member = await msg.guild?.members.fetch(reaction.user.id);
        if (!member || !cmd.checkPrereqs?.(msg, member)) throw new InteractiveError("No member");

        const [embed] = msg.embeds || [];
        if (!embed) throw new InteractiveError("No embed");

        // prettier-ignore
        if (!embed.author?.name?.startsWith("Suggestion from") || !embed.footer?.text?.toLowerCase().includes("react")) throw new InteractiveError("Embed doesn't match");

        /** PERFORM ACTION */
        const title = embed.description;
        if (!title) throw new Error("No title");

        const suggestion = await connection.getRepository(Item).findOne({ type: "Suggestion", title });

        if (!suggestion) throw new Error("no suggestion");

        const reactions: Record<string, SuggestionStatus> = {
            "🏁": SuggestionStatus.Completed,
            "✅": SuggestionStatus.Planned,
            "⚠️": SuggestionStatus.Unclear,
            "❌": SuggestionStatus["Not Planned"]
        };

        const reactionEmoji = reaction.data.emoji.name;
        const status = reactions[reactionEmoji];
        const statusName = Object.keys(SuggestionStatus).find((n) => SuggestionStatus[status] === n) || "";

        suggestion.data = status.toString();
        await suggestion.save();

        await msg.reactions.removeAll();

        embed.setFooter(`${statusName}`);
        embed.setColor(STATUS_COLORS[status]);

        if (status === SuggestionStatus.Planned) {
            embed.setFooter("Planned! React 🏁 to mark as finished");
            await msg.react("🏁");
        } else {
            await msg.react(reactionEmoji);
        }

        await msg.edit(embed);

        const suggester = await msg.guild?.members.fetch(suggestion.id);
        if (!suggester) return;

        const dm = await suggester.createDM();
        if (!dm) return;

        embed.setAuthor(`Your suggestion was marked as ${statusName}`, msg.client.user?.displayAvatarURL());
        embed.setFooter("Feel free to DM the staff with any questions");

        await dm.send(embed);
    }
});
