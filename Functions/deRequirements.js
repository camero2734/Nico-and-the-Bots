module.exports = async function(member, log) {
    if (!member) return;
    const sql = require("sqlite");
    const loadJsonFile = require('load-json-file');
    const writeJsonFile = require('write-json-file');
    sql.open("./daily.sqlite")

    let row = await sql.get(`SELECT * FROM daily WHERE userId="${member.user.id}"`)
    if (!row || !row.date) return "No row";
    
    let oneWeek = 1000 * 3600 * 24 * 7;
    let oneMonth = 1000 * 3600 * 24 * 30;

    const monthly = 10;
    const main = 10;
    const de = 10;

    /* BASIC REQUIREMENTS
    Must meet ONE of the following superstandards:
    - Be a staff memeber :flushed:
    - One of the top 3 users from the previous month

    OR have TWO of the following standards:
    - Two dailys in past three days
    - Monthly score >= to 10 points / day (literally lol)
    - Have at least 10 msgs / day total in main channels (#hometown, #slowtown, and #neon-graveyard)
    - Has at least 10 msgs / day in #dema-council

    BUT Must NOT meet any of the following disqualifications:
    - Has any permanent strikes
    - Has 2 or more warnings in the past month
    */


    /* SuperStandards */
    let superStandardMet = false;
    if (member.roles.get("330877657132564480") || member.roles.get("326558787169288203") || member.roles.get("326558918107070465") || member.roles.get("326558916219502595")) superStandardMet = true;


    /* Disqualifications */
    let disqualified = false;
    //Strikes
    let strikes = await loadJsonFile("./strikes.json");
    if (strikes && strikes[member.user.id]) {
        let userStrikes = strikes[member.user.id];
        for (let prop in userStrikes) {
            if (userStrikes[prop].count > 0 && userStrikes[prop].time === -10) disqualified = true;
        }
    }

    //Warnings
    let warns = await sql.all(`SELECT DISTINCT * FROM warn WHERE userid="${member.user.id}" ORDER BY date DESC LIMIT 25`);
    
    if (warns && Array.isArray(warns)) {
        let count = 0;
        for (let warn of warns) {
            if (Date.now() - oneMonth <= warn.date) count++;
        }
        if (log) console.log(count + " warnings")
        if (count > 2) disqualified = true;
    }


    /* Standards */
    let standardsMet = [];

    //Two dailys in last 3 days
    let daily = await sql.get(`SELECT DISTINCT * FROM daily WHERE userId="${member.user.id}"`)
    let count0 = 0;
    if (daily && typeof daily.weekNum === "string") {
        let threeDays = 1000 * 3600 * 24 * 3;
        for (let time of daily.weekNum.split(",")) {
			if (Date.now() - threeDays < time) count0++;
        }
    }
    if (log) console.log(count0, /LAST THREE DAYS DAILY/)
    if (count0 >= 2) standardsMet.push("last three days dailys");

    //Monthly score
    let scoreRow = await sql.get(`SELECT DISTINCT * FROM scores WHERE userId="${member.user.id}"`)
    let score = scoreRow && scoreRow.points ? scoreRow.points : 0;
    let d = new Date();
    let month = ((d.getMonth()) % 12 + 1);
    let resetDate = new Date();
    if (resetDate.getDate() <= 21) resetDate.setMonth(resetDate.getMonth() - 1);
    resetDate.setDate(21);
    resetDate.setHours(0);
    let daysSinceReset = (new (Date) - resetDate) / (1000 * 3600 * 24);
    if (log) console.log(score / daysSinceReset + " daily messages (" + daysSinceReset + ")")
    if (score / daysSinceReset >= monthly) standardsMet.push("monthly score");

    // //Three dailys in last week
    // let count = 0;
    // if (daily && typeof daily.weekNum === "string") {
    //     for (let time of daily.weekNum.split(",")) {
	// 		if (Date.now() - oneWeek < time) count++;
    //     }
    // }
    // console.log(count, /LAST WEEK DAILY/)
    // if (count >= 3) standardsMet.push("last week dailys");

    //Main channel msgs
    let earliestMain = 999999999999999;
    let mainCount = await sql.get(`SELECT DISTINCT * FROM mainCount WHERE userId="${member.user.id}"`);
    let count2 = 0;
    if (mainCount && typeof mainCount.count === "string") {
        for (let time of mainCount.count.split(",")) {
			if (Date.now() - oneWeek < time) {
                if (time < earliestMain) earliestMain = time;
                count2++;
            }
        }
    }
    if (log) console.log(count2 / 7 + " main per day", /MAIN CHANNEL MSGS/);
    let dayRangeMain = 7;
    if (earliestMain < Date.now()) dayRangeMain = ((Date.now() - earliestMain) / (1000 * 60 * 60 * 24))
    if (count2 / dayRangeMain >= main) standardsMet.push("Main channel msgs");

    
    //#dema-council msgs
    let reqStandard = false;
    let count3 = 0;
    let earliest = 999999999999999;
    if (mainCount && typeof mainCount.dema === "string") {
        for (let time of mainCount.dema.split(",")) {
			if (Date.now() - oneWeek < time) {
                if (time < earliest) earliest = time;
                count3++;
            }
        }
    }
    let dayRange = 7;
    if (earliest < Date.now()) dayRange = ((Date.now() - earliest) / (1000 * 60 * 60 * 24))
    if (log) console.log(count3 / dayRange + " dema per day (" + dayRange + " days)", /MAIN CHANNEL MSGS/)
    if (dayRange === 7 || dayRange < 2) reqStandard = true;
    if (!member.roles.get("283272728084086784") && earliest < Date.now()) {
        await sql.run(`UPDATE mainCount SET dema="" WHERE userId="${member.user.id}"`)
        reqStandard = true;
    }
    if (count3 / dayRange >= de) reqStandard = true;
    if (reqStandard) standardsMet.push("demaMsgs");

    /* Check requirements */

    
    let qualified = true;
    let type = null;
    let message = null;
    if (superStandardMet || member.user.bot) qualified = true;
    else if (disqualified) qualified = false, type = "disqualified", message = "You are disqualified from having DE. This is most likely due to strikes or warns. Please contact a staff member if you believe this is a mistake or should not be applied";
    else if (standardsMet.length < 2) qualified = false, type = "standards", message = "You have fallen below DE standards. The standards are:\n\n**BASIC REQUIREMENTS\n Must meet ONE of the following superstandards:\n - Be a staff memeber :flushed:\n - One of the top 3 users from the previous month\n\n OR have TWO of the following standards:\n - Two dailys in past three days\n - Monthly score >= to 10 points / day (literally lol)\n - Have at least 10 msgs / day total in main channels (#hometown, #lions-den, and #bandito-campout)\n - Has at least 10 msgs / day in #west-wall\n\n BUT Must NOT meet any of the following disqualifications:\n - Has any permanent strikes\n - Has 2 or more warnings in the past month**\n\n";

    return {name: member.displayName, met: standardsMet, message: message, nums: {daily: count0, score: (score / daysSinceReset), main: (count2 / dayRangeMain), de: (count3 / dayRange)}, qualified: qualified, type: type}
}