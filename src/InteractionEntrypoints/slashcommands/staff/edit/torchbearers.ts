import { addYears } from "date-fns";
import { ApplicationCommandOptionType } from "discord.js";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { getActiveFirebreathersApplication } from "../../apply/_consts";

const command = new SlashCommand({
  description: "Edits a user's torchbearers application status",
  options: [
    {
      name: "user",
      description: "The user to modify",
      required: true,
      type: ApplicationCommandOptionType.User,
    },
    {
      name: "action",
      description: "The action to perform",
      required: true,
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: "Reset timer", value: "RESET_TIMER" },
        { name: "Ban", value: "BAN" },
      ],
    },
  ],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  const { user, action } = ctx.opts;

  if (action === "BAN") {
    // Find the most recent torchbearers application and ban the user by setting decidedAt far in the future
    const latestApplication = await prisma.firebreatherApplication.findMany({
      where: { userId: user },
      orderBy: { startedAt: "desc" },
    });

    if (latestApplication) {
      await prisma.firebreatherApplication.update({
        where: { applicationId: latestApplication[0].applicationId },
        data: {
          decidedAt: addYears(new Date(), 100),
          approved: false,
          startedAt: addYears(new Date(), 100),
          submittedAt: addYears(new Date(), 100),
        },
      });
    } else {
      // Create a banned application entry if none exists
      await prisma.firebreatherApplication.create({
        data: {
          userId: user,
          decidedAt: addYears(new Date(), 100),
          approved: false,
          startedAt: addYears(new Date(), 100),
          submittedAt: addYears(new Date(), 100),
        },
      });
    }

    await ctx.editReply({
      content: "User can no longer apply for torchbearers",
    });
  } else if (action === "RESET_TIMER") {
    // Find the most recent torchbearers application and reset the timer
    const latestApplication = (await getActiveFirebreathersApplication(user)) || await prisma.firebreatherApplication.findFirst({
      where: { userId: user },
      orderBy: { startedAt: "desc" },
    });

    if (latestApplication) {
      await prisma.firebreatherApplication.update({
        where: { applicationId: latestApplication.applicationId },
        data: {
          decidedAt: new Date(0), // Set to epoch to effectively reset the timer
          submittedAt: new Date(0),
          startedAt: new Date(0),
        },
      });
      await ctx.editReply({
        content: "User's torchbearers application timer has been reset.",
      });
    } else {
      await ctx.editReply({
        content: "No torchbearers application found for this user.",
      });
    }
  }
});

export default command;
