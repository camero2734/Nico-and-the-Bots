module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;
        const git = require('simple-git')();
        try {
            console.log("here");
            await git.add(".");
            await git.commit(removeCommand(msg.content) || "Bug fixes");
            await git.push('origin', 'master');
            await msg.channel.embed("Pushed successfully!");
        } catch(e) {
            console.log(e);
            msg.channel.embed("Error in pushing: " + e.message);
        }
    },
    info: {
        aliases: false,
        example: "!pushgit [Commit Message]",
        minarg: 0,
        description: "What?",
        category: "Staff",
    }
}