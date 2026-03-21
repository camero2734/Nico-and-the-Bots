import { Colors, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../../Structures/EntrypointSlashCommand";
import { minutesToMilliseconds } from "date-fns";

interface Ping {
  ping: number;
  time: number;
}

const previousPings: Ping[] = [];
const PING_TIME = minutesToMilliseconds(5);

const command = new SlashCommand({
  description: "Checks the bot's ping",
  options: [],
});

command.setHandler(async (ctx) => {
  const { interaction } = await ctx.deferReply({ withResponse: true });
  const currentPing = Math.abs(ctx.createdTimestamp - interaction.createdTimestamp);

  previousPings.push({ ping: currentPing, time: Date.now() });

  let pingSum = 0;
  let pingCount = 0;

  for (let i = previousPings.length - 1; i >= 0; i--) {
    if (previousPings[i].time + PING_TIME >= Date.now()) {
      pingSum += previousPings[i].ping;
      pingCount++;
    } else {
      previousPings.splice(i, 1);
    }
  }

  const average = Math.floor(pingSum / pingCount);

  const embed = new EmbedBuilder()
    .setColor(Colors.Gold)
    .setTitle(`${currentPing}ms ping`)
    .addFields([
      { name: "Heartbeat", value: `${Math.floor(ctx.client.ws.ping)}ms` },
      { name: "Websocket", value: `${ctx.client.ws.ping}ms` },
      {
        name: "Average ping",
        value: `${average}ms over ${pingCount} ping${pingCount === 1 ? "" : "s"}`,
      },
    ]);
  await ctx.editReply({ embeds: [embed] });
});

export default command;
