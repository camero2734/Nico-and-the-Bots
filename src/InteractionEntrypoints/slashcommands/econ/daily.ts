import { createCanvas, loadImage } from "@napi-rs/canvas";
import { addDays, differenceInDays } from "date-fns";
import { EmbedBuilder } from "discord.js";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma, queries } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Claims your daily credits",
    options: []
});

const albumRoles = roles.albums;
command.setHandler(async (ctx) => {
    await ctx.reply({
        embeds: [new EmbedBuilder({ description: "Connecting to Daily Electronic Message Archive...", color: 0xff0000 })]
    });

    const dbUser = await queries.findOrCreateUser(ctx.member.id, { dailyBox: true });
    const dailyBox = dbUser.dailyBox ?? (await prisma.dailyBox.create({ data: { userId: ctx.member.id } }));

    // Calculate time remaining
    const lastDaily = dailyBox.lastDaily || new Date(0);
    const daysSinceDaily = differenceInDays(new Date(), lastDaily);
    if (daysSinceDaily < 1 && userIDs.me !== ctx.member.id) {
        const nextDaily = addDays(lastDaily, 1);
        const timestamp = F.discordTimestamp(nextDaily, "relative");
        throw new CommandError(`You have already used daily today! You can get your next daily ${timestamp}`); // prettier-ignore
    }

    // Daily count
    const wasConsecutive = daysSinceDaily < 2; // Within 48 hours of the last daily
    const { consecutiveDailyCount } = await prisma.dailyBox.update({
        where: { userId: ctx.member.id },
        data: {
            dailyCount: { increment: 1 },
            consecutiveDailyCount: wasConsecutive ? { increment: 1 } : 0,
            lastDaily: new Date()
        },
        select: { consecutiveDailyCount: true }
    });
    const isWeeklyBonus = consecutiveDailyCount > 0 && consecutiveDailyCount % 7 === 0;

    // Weekly consecutive bonus
    if (isWeeklyBonus) {
        await prisma.user.update({
            where: { id: ctx.member.id },
            data: { credits: { increment: 2000 } }
        });
    }

    // DoubleDaily Perk
    const perks = await prisma.perk.findMany({
        where: {
            type: { in: ["DoubleDailyCredits", "DoubleDailyTokens"] },
            userId: ctx.member.id
        }
    });
    const hasDoubleCredits = perks.some((p) => p.type === "DoubleDailyCredits");
    const hasDoubleTokens = perks.some((p) => p.type === "DoubleDailyTokens");

    const isCommon = ctx.member.roles.cache.has(roles.common);
    const creditsToGive = (isCommon ? 300 : 200) * (hasDoubleCredits ? 2 : 1) + (isWeeklyBonus ? 2000 : 0);
    const badgeLogo = isCommon ? "cf" : hasDoubleCredits ? "dd" : null;

    await prisma.user.update({
        where: { id: ctx.member.id },
        data: { credits: { increment: creditsToGive } }
    });

    // CHANGE BACKGROUND BASED ON ALBUM ROLE
    // prettier-ignore
    const src = Object.values(albumRoles).find(r => ctx.member.roles.cache.has(r));
    const backgroundName = (() => {
        switch (src) {
            case albumRoles.ST:
                return "self_titled";
            case albumRoles.RAB:
                return "rab";
            case albumRoles.VSL:
                return "vessel";
            case albumRoles.BF:
                return "blurryface";
            case albumRoles.TRENCH:
                return "trench";
            default:
                return "sai";
        }
    })();
    const background = await loadImage(`./src/Assets/images/daily_cards/${backgroundName}.png`);
    const cf = await loadImage("./src/Assets/badges/commonfren.png");
    const dd = await loadImage("./src/Assets/badges/firebreather.png");

    const canvas = createCanvas(500, 162);
    const cctx = canvas.getContext("2d");
    cctx.drawImage(background, 0, 0);

    //MAKE TEXT FIT
    const maxWidth = 300;
    const maxHeight = 50;
    let measuredTextWidth = 1000;
    let measuredTextHeight = 1000;
    let checkingSize = 40;
    while ((measuredTextWidth > maxWidth || measuredTextHeight > maxHeight) && checkingSize > 5) {
        checkingSize--;
        cctx.font = checkingSize + "px Futura";
        const textInfo = cctx.measureText(ctx.member.displayName);
        measuredTextWidth = textInfo.width;
        measuredTextHeight = textInfo.actualBoundingBoxAscent + textInfo.actualBoundingBoxDescent;
    }

    //DRAW NAME
    cctx.fillStyle = ctx.member.displayHexColor;
    cctx.font = checkingSize + "px Futura";
    cctx.fillText(ctx.member.displayName, 120, 65);

    //DRAW GOT CREDITS & BADGE
    cctx.fillStyle = "white";
    cctx.font = "40px Futura";
    const creditsEarnedLine = `Got ${creditsToGive} credits!`;
    cctx.fillText(creditsEarnedLine, 120, 120);
    const { width } = cctx.measureText(creditsEarnedLine);
    if (badgeLogo === "cf") cctx.drawImage(cf, 130 + width, 91, 30, 30);
    else if (badgeLogo === "dd") cctx.drawImage(dd, 130 + width, 91, 30, 30);

    // Give tokens
    const currentTokens = dailyBox.tokens;
    const tokensToGive = hasDoubleTokens ? 2 : 1;
    const tokenSum = currentTokens + tokensToGive;

    const newTokens = Math.min(tokenSum, 5); // Limit to 5

    await prisma.dailyBox.update({
        where: { userId: ctx.member.id },
        data: { tokens: newTokens }
    });

    const tokenMessage = (() => {
        if (tokenSum === newTokens) {
            return `You earned ${tokensToGive} token${F.plural(tokensToGive)}!`;
        } else if (newTokens === currentTokens) {
            return `You have the maximum number of tokens, so you did not earn any today. Spend them with the \`/econ resupply\` command`;
        } else {
            return `You have reached the maximum number of tokens! Spend one with the \`/econ resupply\` command to ensure you earn one tomorrow.`;
        }
    })();

    const facts = [
        "If you're going to a concert, there are concert channels! Use the `/concert` command to find yours.",
        `You can buy color roles from <#${channelIDs.shop}>! To view and equip your color roles, use the \`/roles colors\` command.`,
        "The `/tags create` command can be used to add a snippet of text that you can later make the bot send with the `/tags use` command!",
        `You can submit an interview to <#${channelIDs.interviews}> with the \`/submit interview\` command.`,
        "Use the `/roles topfeed` command to get a ping when Tyler or Josh post on social media, as well as when dmaorg.info updates!",
        "You can follow us on [Twitter](https://twitter.com/discordclique) or on [Instagram](https://www.instagram.com/discordclique/)!",
        `We have theory channels for talking about dmaorg.info/new stuff! <#${channelIDs.leakstheories}> is available to everyone, and <#${channelIDs.verifiedtheories}> is available to anyone who passes a short quiz!\nUse \`/apply verified\` to take the quiz!`,
        `Check out <#${channelIDs.creations}> and <#${channelIDs.bestcreations}> to see user-submitted art!`,
        `Check out <#${channelIDs.positivity}> for cute pets and words of encouragement!`,
        `Check out <#${channelIDs.polls}> to vote on polls created by staff members!`,
        `Head over to <#${channelIDs.suggestions}> to submit a suggestion about the server!`,
        `Find a message really funny, or a piece of art really amazing? Right click the message and select "Gold Message" under Apps. \n\nTheir message will show up in <#${channelIDs.houseofgold}>!`
    ];

    const randomFact = F.randomValueInArray(facts);
    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`${ctx.member.displayName}'s Daily`)
        .setFooter({ text: "Have an idea for another server tip? Submit it with /submit suggestion" })
        .addFields([{ name: "Server Fact", value: randomFact }])
        .addFields([{ name: "Tokens Earned", value: `${tokenMessage}` }])
        .addFields([{ name: "Total tokens", value: `You have **${newTokens}** token${F.plural(newTokens)}.` }])
        .setImage("attachment://daily.png");

    if (isWeeklyBonus) {
        embed.addFields([{
            name: "Weekly daily bonus!",
            value: "You've done `/econ daily` 7 days in a row, so you've earned 2000 extra credits!"
        }]);
    }

    await ctx.editReply({
        embeds: [embed],
        files: [
            {
                name: "daily.png",
                attachment: canvas.toBuffer('image/png')
            }
        ]
    });
});

export default command;
