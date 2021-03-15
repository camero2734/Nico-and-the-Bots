// async interactive(msg, connection, reaction) {
//     /** VERIFY INTERACTION BELONGS TO MESSAGE */
//     const embed = msg.embeds[0];
//     if (!embed) throw new InteractiveError("No embed");

//     // prettier-ignore
//     if (!embed.title?.endsWith("'s FM") || reaction.data.emoji.name !== FM_REACT) throw new InteractiveError("Failed to match");

//     /** PERFORM ACTION */
//     // Find FM entry in DB
//     const fmItem = await connection.getRepository(FM).findOne({ message_id: msg.id });
//     if (!fmItem) throw new Error("Unable to find FM item");

//     if (fmItem.id === reaction.user.id) throw new Error("Trying to star own FM");

//     console.log(fmItem);

//     // Log star to DB
//     const users = (await reaction.data.users.fetch())
//         .array()
//         .filter((u) => !u.bot)
//         .map((u) => u.id);

//     fmItem.stars = users.length;
//     await fmItem.save();
// }
