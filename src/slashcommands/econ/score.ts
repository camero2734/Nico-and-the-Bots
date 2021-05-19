import { createCanvas, loadImage, registerFont } from "canvas";
import { roles } from "configuration/config";
import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Economy } from "database/entities/Economy";
import { badgeLoader } from "helpers";
import { CommandOptionType } from "slash-create";
import { MoreThan } from "typeorm";

export const Options: CommandOptions = {
    description: "the score",
    options: [
        { name: "user", description: "The user to check the score for", required: false, type: CommandOptionType.USER }
    ]
};

export const Executor: CommandRunner<{ user: string }> = async (ctx) => {
    const albumRoles = roles.albums;
    const options = ctx.opts;
    const { client, connection } = ctx;

    console.log(options, /OPTIONS/);

    const userID = options.user || ctx.user.id;

    const member = await client.guilds.cache.get(ctx.guildID || "")?.members.fetch(userID);

    if (!member) throw new CommandError("Unable to fetch that member");
    if (member?.user?.bot) throw new CommandError("Bots scores are confidential. Please provide an access card to Area 51 to continue."); // prettier-ignore

    // Fetch user's information
    let userGold = await connection.getRepository(Counter).findOne({ id: userID, title: "GoldCount" });
    if (!userGold) userGold = new Counter({ id: userID, title: "GoldCount" });
    let userEconomy = await connection.getRepository(Economy).findOne({ id: userID });
    if (!userEconomy) userEconomy = new Economy({ id: userID });

    // Calculate a users place
    const economies = await connection
        .getRepository(Economy)
        .find({ monthlyScore: MoreThan(userEconomy.monthlyScore) });
    const placeNum = economies.length + 1;

    // Get images to place on card as badges
    const badges = await badgeLoader(member, userGold, placeNum, connection);

    //CALCULATE POINTS TO NEXT LEVEL
    let rq = 100;
    let totalscore = 0;
    let cL = 0;
    let previousScore = 0;
    while (cL < userEconomy.level + 1) {
        if (cL === userEconomy.level) previousScore = totalscore;
        totalscore += rq;
        rq = rq + 21 - Math.pow(1.001450824, rq);
        cL++;
    }
    const rem = Math.floor(totalscore - userEconomy.alltimeScore) + 1; //REMAINING TO NEXT LEVEL
    const diff = Math.floor(totalscore - previousScore); //TOTAL TO NEXT LEVEL
    const percent = (1 - rem / diff).toFixed(3); //RATIO OF REMAINING TO TOTAL

    //LOAD FONTS
    const fonts = ["h", "f", "NotoEmoji-Regular", "a", "j", "c", "br"];
    for (const font of fonts) registerFont(`./src/assets/fonts/${font}.ttf`, { family: "futura" });

    //FIND USER ALBUM ROLE (TRENCH => DEFAULT)
    const src = Object.values(albumRoles).find((id) => member.roles.cache.get(id)) || albumRoles.TRENCH;

    //changes font color based on background color
    const invertedRoles = [albumRoles.VSL, albumRoles.NPI, albumRoles.RAB, albumRoles.ST];
    const inverted = invertedRoles.indexOf(src as string) !== -1;

    //Create canvas
    const canvas = createCanvas(500, 500);
    const cctx = canvas.getContext("2d");

    // Get images
    let avatar_url = member.user.avatarURL({ format: "png", size: 512 });
    if (!avatar_url) avatar_url = `https://ui-avatars.com/api/?background=random&name=${member.displayName}`;

    const img = await loadImage(avatar_url);
    const goldcircle = await loadImage("./src/assets/badges/goldcircle.png");
    const background = await loadImage(`./src/assets/albums/${src}.png`);

    //FIND SHORTEST NAME FOR USER
    let username = member.displayName;
    if (member.user.username.length < username.length) username = member.user.username;

    //MAKE TEXT FIT
    const maxWidth = 210;
    const maxHeight = 50;
    let measuredTextWidth = 1000;
    let measuredTextHeight = 1000;
    let checkingSize = 100;
    while ((measuredTextWidth > maxWidth || measuredTextHeight > maxHeight) && checkingSize > 5) {
        checkingSize--;
        cctx.font = checkingSize + "px futura";
        const textInfo = cctx.measureText(username);
        measuredTextWidth = textInfo.width;
        measuredTextHeight = textInfo.actualBoundingBoxAscent + textInfo.actualBoundingBoxDescent;
    }

    //DRAW AND WRITE
    cctx.drawImage(background, 0, 0, 500, 500);
    cctx.drawImage(img, 388, 14, 98, 101);
    //USERNAME
    cctx.font = checkingSize + "px futura";
    cctx.textAlign = "start";
    cctx.fillStyle = src === albumRoles.TRENCH ? "black" : inverted ? "black" : "white";
    cctx.fillText(username, 177, 90);
    //POINTS
    cctx.font = "30px futura";
    cctx.fillStyle = inverted ? "black" : "white";
    cctx.fillText(userEconomy.monthlyScore + " / " + userEconomy.alltimeScore, 17, 258);
    //LEVEL
    cctx.fillText(`${userEconomy.level}`, 17, 193);
    //LEVEL UP BAR / POINTS TO NEXT LEVEL
    const colorsArray = ["#FCE300", "#80271F", "#6BC1DA", "#FC3F03", "#ACCD40", "#C6ADAE"];
    cctx.save();
    cctx.fillStyle = "#555555"; //BACKGROUND BAR
    cctx.fillRect(20, 360, 186, 30);
    cctx.fillStyle = colorsArray[Object.values(albumRoles).indexOf(src)];
    cctx.fillRect(20, 360, 186 * Number(percent), 30);
    cctx.textAlign = "center";
    cctx.fillStyle = "white";
    cctx.strokeStyle = "black";
    cctx.lineWidth = 3;
    cctx.strokeText(`${rem}`, 113, 387);
    cctx.fillText(`${rem}`, 113, 387);
    cctx.restore();
    //CREDITS
    cctx.fillText(`${userEconomy.credits}`, 17, 322);
    //GOLD
    const goldx = 15;
    const goldy = 394;
    cctx.drawImage(goldcircle, goldx, goldy, 30, 30);
    const goldnum = userGold && userGold.count ? userGold.count : 0;
    cctx.textAlign = "start";
    cctx.fillStyle = inverted ? "black" : "white";
    cctx.fillText("x" + goldnum, goldx + 35, goldy + 26);
    //BADGES
    if (badges.length > 0) {
        for (let i = 0; i < badges.length; i++) {
            //Initial y value
            const y_val = 158;
            //Num. of badges in each column
            const maxbadges = 4;
            //Calculate x value depending on i #
            const x_val = (240 / maxbadges) * (i % maxbadges) + 241;
            //Calculate x shift
            const shift = (Math.floor(i / maxbadges) * 240) / maxbadges;
            //Draw the badges!
            cctx.drawImage(badges[i], x_val, y_val + shift, 225 / maxbadges, 225 / maxbadges);
        }
    }
    //MONTHLY RANKING
    cctx.font = "30px futura";
    cctx.textAlign = "start";
    cctx.fillStyle = src === albumRoles.TRENCH ? "black" : inverted ? "black" : "white";
    cctx.fillText(`${placeNum}`, 41, 50);

    await ctx.sendFollowUp("\u200b", {
        file: [{ name: "score.png", file: canvas.toBuffer() }]
    });
};
