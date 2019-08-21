module.exports = {
    execute: async function(msg){
        let donations = await loadJsonFile("donations.json");

        //if (msg.author.id !== poot) return msg.channel.embed("Only poot can donate credits... for now...")

        let amountToGive = Math.floor(getAmount());
        if (!amountToGive) return msg.channel.embed("Invalid amount");
        if ((amountToGive > 2000 || amountToGive < 1) && msg.author.id !== poot) return msg.channel.embed("Amount must be between 1 and 2000 credits");
        let taggedid = (msg.mentions && msg.mentions.users && msg.mentions.users.first()) ? msg.mentions.users.first().id : false;
        if (!taggedid) return msg.channel.embed("Invalid tagged user");

        //Check how often they donate
        if (typeof donations[msg.author.id] === "undefined") donations[msg.author.id] = {};
        if (typeof donations[msg.author.id][taggedid] === "undefined") {
            console.log("no existy");
            donations[msg.author.id][taggedid] = { recentTime: 0, countTime: 0, count: 0 };
        }

        let relationship = donations[msg.author.id][taggedid];
        let onehour = 3600000;
        let oneweek = 604800000;
        if (Date.now() - relationship.recentTime < onehour && msg.author.id !== poot) return msg.channel.embed(`You cannot donate to <@${taggedid}> because you have donated to them within the last hour!`);
        else if (relationship.count > 3 && Date.now() - relationship.countTime < oneweek && msg.author.id !== poot) return msg.channel.embed(`You cannot donate to <@${taggedid}> because you have donated to them 3 times in the last week!`);


        let taxed = (msg.author.id === poot) ? 0 : Math.ceil(amountToGive * 1.1);
        msg.channel.embed("Would you like to donate " + amountToGive + " credits to <@" + taggedid + ">?\n**The cost will be " + taxed + " credits**");
        let response = await msg.channel.awaitMessage(msg.member, m => {return ((m.content.toLowerCase().indexOf("yes") !== -1 || m.content.toLowerCase().indexOf("no") !== -1) && m.author.id === msg.author.id);});
        if (response && response.content.toLowerCase().indexOf("yes") !== -1) {
            let giverEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
            if (!giverEconomy) giverEconomy = new Economy(msg.author.id);
            let getterEconomy = await connection.getRepository(Economy).findOne({ id: taggedid });
            if (!getterEconomy) getterEconomy = new Economy(taggedid);
            //Check if giver has enough
            if (giverEconomy.credits < taxed && msg.author.id !== poot) return msg.channel.embed("You don't have enough credits to donate " + amountToGive + " credits! The cost is " + taxed + " credits. (10% tax)");
            //Take taxed credits from giver
            if (msg.author.id !== poot) giverEconomy.credits -= taxed;
            getterEconomy.credits += amountToGive;
            //Give requested credits to other person
            await updateJSON();
            await connection.manager.save(giverEconomy);
            await connection.manager.save(getterEconomy);
            await msg.channel.embed(`<@${taggedid}> has been gifted ${amountToGive} credits, giving them ${getterEconomy.credits} credits\n<@${msg.author.id}> donated the credits for a cost of ${taxed} credits, leaving them with ${giverEconomy.credits} credits.`);
        } else msg.channel.embed("Ok, cancelled your donation");


        function getAmount() {
            let amount = 0;
            for (let term of msg.args) {
                if (!isNaN(term)) amount = parseInt(term);
            }
            if (!amount || amount === 0) return false;
            else return amount;
        }

        async function updateJSON() {
            donations[msg.author.id][taggedid].count = relationship.count + 1;
            if (Date.now() - relationship.countTime >= oneweek) {
                console.log(Date.now(), relationship.countTime, Date.now() - relationship.countTime);
                donations[msg.author.id][taggedid].count = 1;
                donations[msg.author.id][taggedid].countTime = Date.now();
            }
            donations[msg.author.id][taggedid].recentTime = Date.now();
            console.log(donations[msg.author.id][taggedid]);
            await writeJsonFile("donations.json", donations);
        }
    },
    info: {
        aliases: false,
        example: "!donate [@ user] [amount]",
        minarg: 0,
        description: "Donates credits to another user",
        category: "Staff"
    }
};