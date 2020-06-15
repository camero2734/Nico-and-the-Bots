module.exports = {
    execute: async function (msg) { /* Command is in shop.js */ },
    info: {
        aliases: false,
        example: "!shop (all)",
        minarg: 0,
        description: "Displays and links to things you can buy in #shop. Use `!shop all` to see everything you don't have, regardless of whether you can afford it or not.",
        category: "NA"
    }
};