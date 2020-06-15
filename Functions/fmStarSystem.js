module.exports = async function(FMentry, msg, reaction, user) {
    const { Discord, connection } = msg.data;

    console.log("fmStarSystem is a go");

    let users = (await reaction.fetchUsers()).array().filter(u => !u.bot).map(u => u.id);
    let starCount = users.length;

    FMentry.stars = starCount;

    await connection.manager.save(FMentry);
}
