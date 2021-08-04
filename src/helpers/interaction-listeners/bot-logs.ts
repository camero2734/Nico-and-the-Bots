import { createInteractionListener } from "../slash-command";

const [name, interaction, genCustomId] = createInteractionListener("botLog", <const>["logType"], async (ctx, args) => {
    //
});

export const BotLogInteractionListener = { name, interaction, genCustomId };
