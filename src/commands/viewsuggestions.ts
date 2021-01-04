import { Command, CommandError, CommandMessage } from "configuration/definitions";
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
    async interactiveFilter(msg, reaction, reactionUser): Promise<boolean> {
        const cmd = <Command>this;
        if (!reaction || !reactionUser) return false;

        const member = await msg.guild?.members.fetch(reactionUser.id);
        if (!member || !cmd.checkPrereqs?.(msg, member)) return false;

        const [embed] = msg.embeds || [];
        if (!embed) return false;

        return (
            !!embed.author?.name?.startsWith("Suggestion from") && !!embed.footer?.text?.toLowerCase().includes("react")
        );
    },
    async interactiveHandler(msg, connection, reaction): Promise<void> {
        const [embed] = msg.embeds;
        const title = embed.description;
        if (!title || !reaction) throw new Error("no title or reaction");

        const suggestion = await connection.getRepository(Item).findOne({ type: "Suggestion", title });

        if (!suggestion) throw new Error("no suggestion");

        const reactions: Record<string, SuggestionStatus> = {
            "🏁": SuggestionStatus.Completed,
            "✅": SuggestionStatus.Planned,
            "⚠️": SuggestionStatus.Unclear,
            "❌": SuggestionStatus["Not Planned"]
        };

        const reactionEmoji = reaction.emoji.name;
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

        const member = await msg.guild?.members.fetch(suggestion.id);
        if (!member) return;

        const dm = await member.createDM();
        if (!dm) return;

        embed.setAuthor(`Your suggestion was marked as ${statusName}`, msg.client.user?.displayAvatarURL());
        embed.setFooter("Feel free to DM the staff with any questions");

        await dm.send(embed);
    }
});
