import { registerTask } from "./absurd";
import type { MessageReference } from "discord.js";
import { guild } from "../../app";

export const scheduleTestTask = registerTask(
  "test",
  async (params: { text: string; message: MessageReference }, ctx) => {
    const stepResult = await ctx.step("log-text", async () => {
      console.log("Logging text:", params.text);
      return `Logged at ${Date.now()}`;
    });

    await ctx.sleepFor("wait-30-seconds", 30);

    const respondResult = await ctx.step("finalize", async () => {
      const message = await guild.channels.fetch(params.message.channelId);
      if (!message || !message.isTextBased()) {
        throw new Error("Channel not found or not text-based");
      }

      if (!params.message.messageId) {
        throw new Error("Message ID is required in message reference");
      }

      const msg = await message.messages.fetch(params.message.messageId);
      await msg.reply(`Your text was: ${params.text}`);
      return "Response sent";
    });

    console.log("Finished task with results:", { stepResult, respondResult });
  },
);
