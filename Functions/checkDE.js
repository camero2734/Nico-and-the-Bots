module.exports = async function(member, check) {
    const loadJsonFile = require('load-json-file');
    const writeJsonFile = require('write-json-file');
    let demaQualify = await loadJsonFile("demawarn.json")
    let response = await check(member);
    let dm = await member.createDM();
    if (!response.qualified) {
        let reason = response.message;
        let threeDays = 1000 * 3600 * 24 * 3;

        if (demaQualify[member.user.id] + threeDays > Date.now()) return;
        if (!demaQualify[member.user.id] && response.type !== "disqualified") {
            demaQualify[member.user.id] = Date.now();
            await writeJsonFile("demawarn.json", demaQualify);
            dm.embed(response.message + "\n\n__This is just a warning__\n\nYou have three days to bring your activity back up before your DE will be temporarily removed.\n**You can still get DE back if you lose it - no need to worry if you're on vacation or taking a break!**\n\nIf you have any questions please ask poot")
        } else {
            dm.embed("You have fallen below the requirements for Death Eaters.\n\n**Reason:**\n\n" + response.message + "\n\nYour DE role has been temporarily removed. Once all standards are met, you can get DE in #shop again once you meet the standards.");
            member.removeRole("283272728084086784");
            member.addRole("498702380007686146");
        }
        
    } else if (demaQualify[member.user.id]) {
        dm.embed("**You have met the qualifications for DE again!**")
        demaQualify[member.user.id] = false;
        await writeJsonFile("demawarn.json", demaQualify);
    }
}