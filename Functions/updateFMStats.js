module.exports = async function(guild, Discord, FMStats, Item, connection, typeorm, nodefetch) {
    // await new Promise(next => setTimeout(next, 5000));
    // let {IsNull, Not} = typeorm;
    // let fms = await connection.getRepository(Item).find({ type: "FM", title: Not(IsNull()) });
    //
    // fms = fms.filter(fm => guild.member(fm.id));
    // deletefms = fms.filter(fm => !guild.member(fm.id)).map(fm => fm.title);
    //
    // console.log(`WHERE fmuser IN ${deletefms.toString()}`)
    //
    // await connection
    // .createQueryBuilder()
    // .delete()
    // .from(FMStats)
    // .where(`fmuser IN ${deletefms.toString()}`)
    // .execute();
}
