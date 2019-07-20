module.exports = {
    execute: async function(msg){
        let donations = await loadJsonFile("donations.json")

        //if (msg.author.id !== poot) return msg.channel.embed("Only poot can donate credits... for now...")

        let amountToGive = Math.floor(getAmount());
        if (!amountToGive) return msg.channel.embed("Invalid amount");
        if ((amountToGive > 2000 || amountToGive < 1) && msg.author.id !== poot) return msg.channel.embed("Amount must be between 1 and 2000 credits");
        let taggedid = (msg.mentions && msg.mentions.users && msg.mentions.users.first()) ? msg.mentions.users.first().id : false
        if (!taggedid) return msg.channel.embed("Invalid tagged user")

        //Check how often they donate
        if (typeof donations[msg.author.id] === 'undefined') donations[msg.author.id] = {};
        if (typeof donations[msg.author.id][taggedid] === 'undefined') {
            console.log('no existy')
            donations[msg.author.id][taggedid] = {recentTime: 0, countTime: 0, count: 0}
        }

        let relationship = donations[msg.author.id][taggedid]
        let onehour = 3600000;
        let oneweek = 604800000;
        if (Date.now() - relationship.recentTime < onehour && msg.author.id !== poot) return msg.channel.embed(`You cannot donate to <@${taggedid}> because you have donated to them within the last hour!`)
        else if (relationship.count > 3 && Date.now() - relationship.countTime < oneweek) return msg.channel.embed(`You cannot donate to <@${taggedid}> because you have donated to them 3 times in the last week!`)


        let tax = (msg.author.id === poot) ? 0 : Math.ceil(amountToGive * 1.1)
        msg.channel.embed("Would you like to donate " + amountToGive + " credits to <@" + taggedid + ">?\n**The cost will be " + tax + " credits**");
        let response = await msg.channel.awaitMessage(msg.member, m => {return ((m.content.toLowerCase().indexOf("yes") !== -1 || m.content.toLowerCase().indexOf("no") !== -1) && m.author.id === msg.author.id)});
        if (response && response.content.toLowerCase().indexOf("yes") !== -1) {
            //Check if giver has enough
            let row = await sql.get(`SELECT * FROM daily WHERE userId="${msg.author.id}"`)
            if (!row || !row.xp || row.xp < parseInt(tax) && msg.author.id !== poot) return msg.channel.embed("You don't have enough credits to donate " + amountToGive + " credits! The cost is " + tax + " credits. (10% tax)")
            //Take taxed credits from giver
            await sql.run(`UPDATE daily SET xp ="${row.xp - tax}" WHERE userid ="${msg.author.id}"`)
            //Give requested credits to other person
            let row2 = await sql.get(`SELECT * FROM daily WHERE userId="${taggedid}"`)
            if (!row2) {
                await sql.run("INSERT INTO daily (userId, xp, date, num) VALUES (?, ?, ?, ?)", [taggedid, 0, Date.now(), 0])
                row2 = await sql.get(`SELECT * FROM daily WHERE userid="${taggedid}"`)
            }
            await sql.run(`UPDATE daily SET xp ="${row2.xp + amountToGive}" WHERE userid ="${taggedid}"`)
            updateJSON()
            msg.channel.embed(`<@${taggedid}> has been gifted ${amountToGive} credits, giving them ${row2.xp + amountToGive} credits\n<@${msg.author.id}> donated the credits for a cost of ${tax} credits, leaving them with ${row.xp - tax} credits.`)
        } else msg.channel.embed("Ok, cancelled your donation")


        function getAmount() {
            let amount = 0
            for (let term of msg.args) {
                if (!isNaN(term)) amount = parseInt(term)
            }
            if (!amount || amount === 0) return false
            else return amount
        }

        async function updateJSON() {
            donations[msg.author.id][taggedid].count = relationship.count + 1;
            if (Date.now() - relationship.countTime >= oneweek) {
                console.log(Date.now(), relationship.countTime, Date.now() - relationship.countTime)
                donations[msg.author.id][taggedid].count = 1;
                donations[msg.author.id][taggedid].countTime = Date.now();
            }
            donations[msg.author.id][taggedid].recentTime = Date.now();
            console.log(donations[msg.author.id][taggedid])
            await writeJsonFile("donations.json", donations);
        }
    },
    info: {
        aliases: false,
        example: "!donate [@ user] [amount]",
        minarg: 0,
        description: "Donates credits to another user",
        category: "Staff",
    }
}