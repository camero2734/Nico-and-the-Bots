import { EntrypointEvents } from "../../Structures/Events";
import { prisma } from "../prisma-init";

async function storeStartedCommands() {
  const startedEvents = EntrypointEvents.events("entrypointStarted");
  for await (const event of startedEvents) {
    const { entrypoint, ctx } = event;

    await prisma.commandUsed.create({
      data: {
        id: ctx.id,
        channelId: ctx.channel?.id,
        identifier: entrypoint.identifier,
        type: ctx.type.toString(),
        userId: ctx.user.id,
        createdAt: ctx.createdAt,
      },
    });
  }
}

async function storeFinishedCommands() {
  const finishedEvents = EntrypointEvents.events("entrypointFinished");
  for await (const event of finishedEvents) {
    const { entrypoint, ctx } = event;

    await prisma.commandUsed.upsert({
      where: { id: ctx.id },
      update: { state: "Finished" },
      create: {
        id: ctx.id,
        channelId: ctx.channel?.id,
        identifier: entrypoint.identifier,
        type: ctx.type.toString(),
        userId: ctx.user.id,
        createdAt: ctx.createdAt,
      },
    });
  }
}

async function storeErroredCommands() {
  const finishedEvents = EntrypointEvents.events("entrypointErrored");
  for await (const event of finishedEvents) {
    const { entrypoint, ctx } = event;

    await prisma.commandUsed.upsert({
      where: { id: ctx.id },
      update: { state: "Errored" },
      create: {
        id: ctx.id,
        channelId: ctx.channel?.id,
        identifier: entrypoint.identifier,
        type: ctx.type.toString(),
        userId: ctx.user.id,
        createdAt: ctx.createdAt,
      },
    });
  }
}

export function logEntrypointEvents() {
  storeStartedCommands();
  storeFinishedCommands();
  storeErroredCommands();
}
