import { createCanvas, loadImage, registerFont } from "canvas";
import { channelIDs, roles, userIDs } from "configuration/config";
import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Economy } from "database/entities/Economy";
import { Item } from "database/entities/Item";
import { GuildMember, MessageAttachment, MessageEmbed, TextChannel } from "discord.js";

type OptionsType = { username: string };

export const Options: CommandOptions = {
    description: "Claims your daily credits",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    const { client, connection } = ctx;

    let userEconomy = await connection.getRepository(Economy).findOne({ id: ctx.user.id });
    if (!userEconomy) userEconomy = new Economy({ id: ctx.user.id });

    //CALCULATE TIME REMAINING
    const curdate = Date.now();
    const timeremain = (86400000 - (curdate - userEconomy.lastDaily)) / 3600000;
    const remain = {
        hours: Math.floor(timeremain),
        mins: Math.floor((timeremain - Math.floor(timeremain)) * 60)
    };
    if (curdate - userEconomy.lastDaily < 86400000 && ctx.user.id !== userIDs.me) {
        const { hours, mins } = remain;
        throw new CommandError(`You have already used !daily today! You have ${hours} hours and ${mins} until the next one`); // prettier-ignore
    }

    ctx.acknowledge(true);

    //DAILY COUNTER
    userEconomy.dailyCount++;
    let dailyCounter = await connection.getRepository(Counter).findOne({ id: ctx.user.id, title: "ConsecutiveDaily" });

    if (!dailyCounter)
        dailyCounter = new Counter({
            id: ctx.user.id,
            title: "ConsecutiveDaily",
            count: 0,
            lastUpdated: curdate
        });
    if (curdate - userEconomy.lastDaily <= 86400000 * 2) {
        dailyCounter.count++;
    } else (dailyCounter.count = 1), (dailyCounter.lastUpdated = curdate);
    userEconomy.lastDaily = curdate;

    //FIXME: Weekly consecutive bonus
    if (dailyCounter.count % 7 === 0) {
        const embed = new MessageEmbed()
            .setDescription(
                "**Weekly `!daily` bonus!**\n\nYou've done !daily 7 days in a row, so you've earned 2000 extra credits!"
            )
            .setColor("RANDOM");
        await ctx.embed(embed);

        userEconomy.credits += 2000;
    }
    await connection.manager.save(dailyCounter);

    //DOUBLEDAILY / GIVE CREDITS
    const hasDouble = await connection
        .getRepository(Item)
        .findOne({ id: ctx.user.id, type: "Perk", title: "doubledaily" });
    let creditsToGive = 200;
    let badgeLogo = null;

    const member = client.guilds.cache.get(ctx.guildID || "")?.members.cache.get(ctx.user.id) as GuildMember;

    if (member?.roles.cache.get("332021614256455690")) {
        creditsToGive = 300;
        badgeLogo = "cf";
    }
    if (hasDouble) {
        creditsToGive *= 2;
        badgeLogo = "dd";
    }
    userEconomy.credits += creditsToGive;

    //CHANGE BACKGROUND BASED ON ALBUM ROLE
    let album = "default";
    if (member.roles.cache.get(roles.albums.TRENCH)) album = "t";
    else if (member.roles.cache.get(roles.albums.BF)) album = "b";
    else if (member.roles.cache.get(roles.albums.VSL)) album = "v";
    else if (member.roles.cache.get(roles.albums.RAB)) album = "r";
    else if (member.roles.cache.get(roles.albums.ST)) album = "s";
    else if (member.roles.cache.get(roles.albums.NPI)) album = "n";

    //LOAD FONTS
    const fonts = ["h", "f", "NotoEmoji-Regular", "a", "j", "c", "br"];
    for (const font of fonts) registerFont(`./src/assets/fonts/${font}.ttf`, { family: "futura" });

    const img = await loadImage("./src/assets/albums/" + album + ".png");
    const cf = await loadImage("./src/assets/badges/cflogo.png");
    const dd = await loadImage("./src/assets/badges/dd.png");
    const img2 = await loadImage("./src/assets/albums/" + album + "2.png");

    const canvas = createCanvas(500, 162);
    const cctx = canvas.getContext("2d");
    cctx.drawImage(img, 0, 0);

    //MAKE TEXT FIT
    const maxWidth = 300;
    const maxHeight = 50;
    let measuredTextWidth = 1000;
    let measuredTextHeight = 1000;
    let checkingSize = 40;
    while ((measuredTextWidth > maxWidth || measuredTextHeight > maxHeight) && checkingSize > 5) {
        checkingSize--;
        cctx.font = checkingSize + "px futura";
        const textInfo = cctx.measureText(member.displayName);
        measuredTextWidth = textInfo.width;
        measuredTextHeight = textInfo.actualBoundingBoxAscent + textInfo.actualBoundingBoxDescent;
    }

    //DRAW NAME
    cctx.fillStyle = member.displayHexColor;
    cctx.font = checkingSize + "px futura";
    cctx.fillText(member.displayName, 120, 65);

    //DRAW GOT CREDITS & BADGE
    cctx.fillStyle = "white";
    cctx.font = "40px futura";
    cctx.fillText(`Got ${creditsToGive} credits!`, 120, 120);
    if (badgeLogo === "cf") cctx.drawImage(cf, 408, 91, 30, 30);
    else if (badgeLogo === "dd") cctx.drawImage(dd, 408, 91, 30, 30);
    cctx.drawImage(img2, 30, 44); //ALBUM LOGO

    //GIVE BLURRYTOKEN
    const hasTokenInc = await connection
        .getRepository(Item)
        .findOne({ id: ctx.user.id, type: "Perk", title: "blurryboxinc" });
    const bTokensToGive = hasTokenInc ? 2 : 1;

    const before = userEconomy.blurrytokens;
    const after = Math.min(userEconomy.blurrytokens + bTokensToGive, 5); //LIMIT TO 5
    userEconomy.blurrytokens = after;

    let tokenMessage = "None";

    if (after > before && after === 5) {
        //JUST REACHED 5
        tokenMessage = `You earned **${after - before} token${
            after - before === 1 ? "" : "s"
        }**! You have now reached the **maximum number of 5 tokens**, so you should spend them with \`!blurrybox.\``;
    } else if (after === before && after === 5) {
        //STILL AT 5
        tokenMessage = "**You have the maximum number of tokens, so you did not earn any today!** Spend them with `!blurrybox.`"; // prettier-ignore
    } else {
        //EARNED SOME
        tokenMessage = `You earned **${after - before} token${
            after - before === 1 ? "" : "s"
        }**! You now have **${after} token${after === 1 ? "" : "s"} total**- you can spend ${
            after === 1 ? "it" : "them"
        } with \`!blurrybox.\``;
    }

    try {
        await connection.manager.save(userEconomy);
    } catch (e) {
        console.log(e);
        throw new CommandError("<@221465443297263618> failed to save userEconomy");
    }

    const facts = [
        "If you're going to a concert, there are concert channels! Simply say `!concert CityName` to join yours.",
        "You can create a custom profile with `!createprofile`.",
        "If you boost the server with nitro, you can add a custom emoji! Use the `!boostemoji` command.",
        `You can buy color roles from <#${channelIDs.shop}>! To see the colors of the available roles, use the \`!cr\` command.\n\n To view and equip your color roles, say \`!cc\`.`,
        "The `!createtag` command can be used to add a snippet of text that you can later make the bot send with the `!tag` command!",
        `You can submit an interview to <#${channelIDs.interviews}> with the \`!interview\` command.`,
        "Use the `!topfeed` command to get a ping when Tyler or Josh post on social media, as well as when dmaorg.info updates!",
        "You can use the `!commands` command to view a list of commands (sorted into categories).",
        "You can follow us on [Twitter](https://twitter.com/discordclique) or on [Instagram](https://www.instagram.com/discordclique/)!",
        "We have a music bot - <@470705413885788160>! You can use `!play Clear twenty one pilots` to play the best song in existence.",
        `We have theory channels for talking about dmaorg.info/leaks/new stuff! <#${channelIDs.leakstheories}> is available to everyone, and <#${channelIDs.verifiedtheories}> is available to anyone who passes a short quiz!\nUse \`!appeal\` to take the quiz!`,
        `Check out <#${channelIDs.creations}> and <#${channelIDs.bestcreations}> to see user-submitted art!`,
        `Check out <#${channelIDs.positivity}> for cute pets and words of encouragement!`,
        `Check out <#${channelIDs.hiatusmemes}> for era-related memes!`,
        `Check out <#${channelIDs.polls}> to vote on polls created by staff members!`,
        `Head over to <#${channelIDs.suggestions}> to submit a suggestion about the server!`,
        `Find a message really funny, or a piece of art really amazing? React with :gold: to give them gold! (Costs 5000 credits). \n\nTheir message will show up in <#${channelIDs.houseofgold}>!`
    ];

    const channel = client.guilds.cache.get(ctx.guildID || "")?.channels.cache.get(ctx.channelID) as TextChannel;

    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    const embed = new MessageEmbed()
        .setColor("RANDOM")
        .setTitle(member.displayName + "'s Daily")
        .setFooter("Have an idea for another server tip? Submit it with !suggest");
    embed.addField("Server Fact", randomFact);
    embed.addField("Blurrytokens Earned", tokenMessage);
    embed.attachFiles([new MessageAttachment(canvas.toBuffer(), "daily.png")]);
    embed.setImage("attachment://daily.png");
    await channel.send(embed);
};
