module.exports = async function(msg) {
    //TYLER, JOSH, BAND, JEN-DEB-JIM, 
    setTimeout(async () => {
        let roleIDS = ["534890883016032257", "534890899323224064", "534890910526472202", "534890933301542912", "535588989713907713", "534890931573358623", "534890940343779328", "534890903664328714", "538224831779307534"];
        for (let id of roleIDS) {
            let role = msg.guild.roles.get(id);
            if (!role) continue;
            await role.setMentionable(false);
        }
    }, 3000);
}