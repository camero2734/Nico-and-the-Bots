module.exports = {
    execute: async function (msg) {
        try {
            if (!msg.member.hasPermission("BAN_MEMBERS")) return msg.channel.embed("You must be an Admin or Moderator to use this command");
            if (!msg.args || !msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return msg.channel.embed("Invalid input!");
            
            let mem = msg.mentions && msg.mentions.members ? msg.mentions.members.first() : null;
            let num = msg.args && msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] : 1;
            if (!mem || !num) {
                return msg.channel.embed("Invalid input!!");
            }

            let rankUsing = msg.member.highestRole.position;
            let rankUsed = mem.highestRole.position;
            if (rankUsing <= rankUsed && msg.author.id !== poot) return msg.channel.embed("You cannot delete this warning because you have an equal or lesser role than this person.");

            //GET WARN TO DELETE
            let rows = await connection.getRepository(Item).find({ id: mem.id, type: "Warning" });
            let chosenRow = rows && rows[num - 1] ? rows[num - 1] : null;
            if (chosenRow === null) return msg.channel.embed("Invalid warn number given. Use `!chkwarn`.");

            //DELETE
            await connection.manager.remove(chosenRow);
            
            await msg.channel.embed("Deleted warning!");
        } catch (e) {
            console.log(e);
        }
    },
    info: {
        aliases: ["deletewarn", "removewarn"],
        example: "!removewarn [@ user] [Warn #]",
        minarg: 2,
        description: "Deletes a warning for a user",
        category: "Staff"
    }
};