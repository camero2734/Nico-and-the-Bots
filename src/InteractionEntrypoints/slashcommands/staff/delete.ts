import { Embed } from "discord.js/packages/discord.js";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Deletes a certain number of messages",
    options: [
        {
            name: "amount",
            description: "The number of messages to delete",
            required: true,
            type: "INTEGER"
        }
    ]
});

command.setHandler(async (ctx) => {
    const { amount } = ctx.opts;
    const channel = ctx.channel;

    if (amount > 100) throw new CommandError("You can only delete up to 100 messages at a time");

    const deleted = await channel.bulkDelete(amount, true);

    let numDeleted = deleted.size;

    // Need to manually fetch and delete remaining messages
    const remaining = amount - numDeleted;

    if (remaining > 0) {
        const fetched = await channel.messages.fetch({ limit: Math.min(remaining, 100) });

        for (const m of fetched.values()) {
            await m.delete();
            await F.wait(750);
        }
        numDeleted += fetched.size;
    }

    const embed = new Embed({ description: `Deleted ${numDeleted} out of the requested ${amount} messages` });
    await ctx.send({ embeds: [embed] });
});

export default command;
