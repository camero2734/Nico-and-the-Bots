module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;
        console.time("Reset");
        await connection
            .createQueryBuilder()
            .update(Economy)
            .set({ monthlyScore: 0, monthlyLevel: 0 })
            .execute();
        console.timeEnd("Reset");
    },
    info: {
        aliases: false,
        example: "!monthlyreset",
        minarg: 0,
        description: "resets the score boards",
        category: "Staff"
    }
};