import { createCanvas, loadImage } from "canvas";
import { roles } from "configuration/config";
import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Economy } from "database/entities/Economy";
import { Snowflake } from "discord.js";
import { badgeLoader } from "helpers";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: "the score",
    options: [
        { name: "user", description: "The user to check the score for", required: false, type: CommandOptionType.USER }
    ]
};

export const Executor: CommandRunner<{ user: Snowflake }> = async (ctx) => {
    const albumRoles = roles.albums;
    const options = ctx.opts;
    const { connection } = ctx;

    await ctx.defer();

    const userID = options.user || (ctx.user.id as Snowflake);

    const member = await ctx.member.guild.members.fetch(userID);

    if (!member) throw new CommandError("Unable to find that member");
    if (member?.user?.bot) throw new CommandError("Bots scores are confidential. Please provide an access card to Area 51 to continue."); // prettier-ignore

    // Fetch user's information
    let userGold = await connection.getRepository(Counter).findOne({ identifier: userID, title: "GoldCount" });
    if (!userGold) userGold = new Counter({ identifier: userID, title: "GoldCount" });
    let userEconomy = await connection.getRepository(Economy).findOne({ userid: userID });
    if (!userEconomy) userEconomy = new Economy({ userid: userID });

    // Calculate a users place
    const placeNum = (await connection.getMongoRepository(Economy).count({ score: { $gt: userEconomy.score } })) + 1;

    // Get images to place on card as badges
    const badges = await badgeLoader(member, userGold, placeNum, connection);

    //CALCULATE POINTS TO NEXT LEVEL
    let rq = 100;
    let totalscore = 0;
    let cL = 0;
    let previousScore = 0;

    console.log(userEconomy.level);
    while (cL < userEconomy.level + 1) {
        if (cL === userEconomy.level) previousScore = totalscore;
        totalscore += rq;
        rq += 21 - Math.pow(1.001450824, rq);
        cL++;
    }

    const rem = Math.floor(totalscore - userEconomy.score) + 1; //REMAINING TO NEXT LEVEL
    const diff = Math.floor(totalscore - previousScore); //TOTAL TO NEXT LEVEL
    const percent = Math.max(0, 1 - rem / diff).toFixed(3); //RATIO OF REMAINING TO TOTAL

    //FIND USER ALBUM ROLE (SAI => DEFAULT)
    const src = Object.values(albumRoles).find((id) => member.roles.cache.get(id)) || albumRoles.SAI;

    // Changes font color based on background color
    const invertedRoles: string[] = [albumRoles.RAB, albumRoles.ST];
    const inverted = invertedRoles.indexOf(src) !== -1;

    // Create canvas
    const canvas = createCanvas(1000, 1000);
    const cctx = canvas.getContext("2d");

    // Get images
    let avatar_url = member.user.avatarURL({ format: "png", size: 512 });
    if (!avatar_url) avatar_url = `https://ui-avatars.com/api/?background=random&name=${member.displayName}`;

    const img = await loadImage(avatar_url);
    const goldcircle = await loadImage("./src/assets/badges/goldcircle.png");

    // prettier-ignore
    const backgroundName = (() => {
        switch(src) {
            case albumRoles.ST: return "self_titled";
            case albumRoles.RAB: return "rab";
            case albumRoles.VSL: return "vessel"
            case albumRoles.BF: return "blurryface";
            case albumRoles.TRENCH: return "trench";
            default: return "sai";
        }
    })();
    const background = await loadImage(`./src/assets/images/score_cards/${backgroundName}.png`);

    //FIND SHORTEST NAME FOR USER
    let username = member.displayName;
    if (member.user.username.length < username.length) username = member.user.username;

    //MAKE TEXT FIT
    const maxWidth = 420;
    const maxHeight = 100;
    let measuredTextWidth = 1000;
    let measuredTextHeight = 1000;
    let checkingSize = 100;
    while ((measuredTextWidth > maxWidth || measuredTextHeight > maxHeight) && checkingSize > 5) {
        checkingSize--;
        cctx.font = checkingSize + "px Futura";
        const textInfo = cctx.measureText(username);
        measuredTextWidth = textInfo.width;
        measuredTextHeight = textInfo.actualBoundingBoxAscent + textInfo.actualBoundingBoxDescent;
    }

    cctx.strokeStyle = "black";
    cctx.fillStyle = inverted ? "black" : "white";
    cctx.lineWidth = inverted ? 0 : 6;

    // Background and avatar
    cctx.drawImage(background, 0, 0, 1000, 1000);
    cctx.drawImage(img, 776, 20, 200, 200);

    cctx.save();
    cctx.translate(325, 170);

    //USERNAME
    cctx.font = "bold " + checkingSize + "px Futura";
    cctx.textAlign = "start";
    cctx.strokeText(username, 0, 0);
    cctx.fillText(username, 0, 0);

    //LEVEL
    cctx.restore();
    cctx.font = "bold 60px Futura";
    cctx.save();

    cctx.translate(35, 380);
    cctx.strokeText(`${userEconomy.level}`, 0, 0);
    cctx.fillText(`${userEconomy.level}`, 0, 0);

    //POINTS
    cctx.translate(0, 130);
    cctx.strokeText(`${userEconomy.score}`, 0, 0);
    cctx.fillText(`${userEconomy.score}`, 0, 0);

    //CREDITS
    cctx.translate(0, 130);
    cctx.strokeText(`${userEconomy.credits}`, 0, 0);
    cctx.fillText(`${userEconomy.credits}`, 0, 0);

    //LEVEL UP BAR / POINTS TO NEXT LEVEL
    cctx.translate(0, 130);
    const colorsArray = ["#F18BB0", "#FCE300", "#80271F", "#6BC1DA", "#FC3F03", "#ACCD40", "#C6ADAE"];
    cctx.save();
    cctx.fillStyle = "#555555"; //BACKGROUND BAR
    cctx.fillRect(0, -54, 372, 60);
    cctx.fillStyle = colorsArray[Object.values(albumRoles).indexOf(src)];
    cctx.fillRect(0, -54, 372 * Number(percent), 60);
    cctx.textAlign = "center";
    cctx.fillStyle = "white";
    cctx.strokeStyle = "black";
    cctx.lineWidth = 3;
    cctx.strokeText(`${rem}`, 186, 0);
    cctx.fillText(`${rem}`, 186, 0);
    cctx.restore();

    //GOLD
    const goldnum = userGold?.count || 0;
    cctx.textAlign = "start";
    cctx.translate(0, 65);
    cctx.drawImage(goldcircle, 0, -50, 60, 60);
    cctx.strokeText(`x${goldnum}`, 70, 0);
    cctx.fillText(`x${goldnum}`, 70, 0);

    //BADGES
    cctx.restore();
    if (badges.length > 0) {
        //Initial y value
        const y_val = 306;
        //Num. of badges in each column
        const maxbadges = Math.min(3, Math.ceil(Math.sqrt(badges.length)));
        for (let i = 0; i < Math.min(badges.length, maxbadges ** 2); i++) {
            //Calculate x value depending on i #
            const x_val = (480 / maxbadges) * (i % maxbadges) + 482;
            //Calculate x shift
            const shift = (Math.floor(i / maxbadges) * 480) / maxbadges;
            //Draw the badges!
            cctx.drawImage(badges[i], x_val, y_val + shift, 450 / maxbadges, 450 / maxbadges);
        }
    }
    //MONTHLY RANKING
    cctx.strokeText(`${placeNum}`, 85, 100);
    cctx.fillText(`${placeNum}`, 85, 100);

    await ctx.send({
        embeds: [],
        file: [{ name: "score.png", file: canvas.toBuffer() }]
    });
};
