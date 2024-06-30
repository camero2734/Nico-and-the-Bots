/* eslint-disable @typescript-eslint/no-explicit-any */
import { userIDs } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";

// enum ActionTypes {
//     View,
//     Purchase
// }

const msgInt = new ManualEntrypoint();

export const GenSongBtnId = msgInt.addInteractionListener("shopSongsBtn", [], async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    if (ctx.member.id !== userIDs.me) throw new CommandError("This command is not available to you.");

    await ctx.editReply({ content: "This is a test message." });
});

export default msgInt;
