import { createCanvas, loadImage } from "canvas";
import { CommandError, CommandOptions, CommandRunner, ExtendedContext } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { CreditHistory } from "database/entities/CreditHistory";
import { Economy } from "database/entities/Economy";
import { subWeeks } from "date-fns";
import { GuildMember, Snowflake } from "discord.js";
import { badgeLoader } from "helpers";
import { calculateLevel } from "helpers/score-manager";
import fetch from "node-fetch";
import { CommandContext, CommandOptionType } from "slash-create";
import { Connection } from "typeorm";

export const Options: CommandOptions = {
    description: "Displays the server point leaderboard",
    options: [
        {
            name: "page",
            description: "The page number of the leaderboard to check",
            required: false,
            type: CommandOptionType.INTEGER
        },
        {
            name: "timeperiod",
            description: "The time period over which to display statistics. Defaults to 1 month.",
            required: false,
            type: CommandOptionType.INTEGER,
            choices: [
                { name: "Last week", value: 1 },
                { name: "Last month", value: 4 },
                { name: "Last 3 months", value: 13 },
                { name: "Last 6 months", value: 26 },
                { name: "Last year", value: 52 }
            ]
        }
    ]
};

const PAGE_SIZE = 10;

export const Executor: CommandRunner<{ page?: number; timeperiod?: number }> = async (ctx) => {
    const { page, timeperiod } = ctx.opts;
    const pageNum = page && page > 0 ? page - 1 : 0; // Computers tend to like to start at zero. Also negative pages don't make sense

    await ctx.defer();

    const startTime = Date.now();
    const memberScores = await getMemberScores(ctx, pageNum, timeperiod);

    const timeStamp = Date.now() - startTime;

    if (memberScores.length === 0) throw new CommandError("This page doesn't exist!");

    const choice = Options.options?.find((o) => o.name === "timeperiod")?.choices?.find((c) => c.value === timeperiod);
    const timePeriodStr = (timeperiod && choice?.name) || "All time";

    const buffer = await generateImage(memberScores, pageNum, ctx.connection, timePeriodStr);

    await ctx.send(`Took ${Date.now() - startTime} ms (${timeStamp} ms) to fetch ${memberScores.length} items`, {
        file: [{ name: `top-over${timeperiod || 0}-page${pageNum}.png`, file: buffer }]
    });
};

async function getMemberScores(
    ctx: ExtendedContext,
    pageNum: number,
    timeperiod?: number
): Promise<{ member: GuildMember; score: number }[]> {
    const creditRepo = ctx.connection.getMongoRepository(CreditHistory);
    const economyRepo = ctx.connection.getMongoRepository(Economy);

    // Use CreditHistory to calculate the score over the provided interval
    if (timeperiod) {
        const userScores: Record<string, number> = {};
        const now = new Date();
        const startDate = subWeeks(now, timeperiod);
        const histories = await creditRepo.find({ where: { date: { $gte: startDate, $lte: now } } });

        // Calculate each user's score
        for (const day of histories) {
            for (const [userid, score] of Object.entries(day.entries)) {
                if (!userScores[userid]) userScores[userid] = 0;
                userScores[userid] += score;
            }
        }

        const sortedScores = Object.entries(userScores)
            .map(([id, score]) => ({ id, score }))
            .sort((a, b) => b.score - a.score);

        const memberScores: { member: GuildMember; score: number }[] = [];
        let curIdx = pageNum * PAGE_SIZE;
        while (memberScores.length !== PAGE_SIZE) {
            const curScore = sortedScores[curIdx++];
            if (!curScore) break; // No more scores

            const member = await ctx.member.guild.members.fetch(<Snowflake>curScore.id);
            memberScores.push({ member, score: curScore.score });
        }

        return memberScores;
    }
    // All time score is trivially just a comparison of the `score` property
    else {
        // Need to be able to make multiple fetches in case some users left
        let skip = pageNum * 10;
        const fetchEcons = async () => {
            const econs = await economyRepo.find({ order: { score: "DESC" }, take: PAGE_SIZE, skip });
            skip += PAGE_SIZE;
            return econs;
        };

        const memberScores: { member: GuildMember; score: number }[] = [];
        while (memberScores.length < PAGE_SIZE) {
            const econs = await fetchEcons();
            for (const econ of econs) {
                if (memberScores.length >= PAGE_SIZE) break;
                const member = await ctx.member.guild.members.fetch(<Snowflake>econ.userid);
                memberScores.push({ member, score: econ.score });
            }
            if (econs.length < PAGE_SIZE) break; // No more left to fetch
        }
        return memberScores.slice(0, PAGE_SIZE);
    }
}

async function generateImage(
    userScores: { member: GuildMember; score: number }[],
    pageNum: number,
    connection: Connection,
    timePeriodStr: string
): Promise<Buffer> {
    const ACTUAl_WIDTH = 1000;
    const ACTUAL_HEIGHT = 1400;

    const UNIT_WIDTH = 500;
    const UNIT_HEIGHT = 700;

    const canvas = createCanvas(ACTUAl_WIDTH, ACTUAL_HEIGHT);
    const cctx = canvas.getContext("2d");

    cctx.scale(ACTUAl_WIDTH / UNIT_WIDTH, ACTUAL_HEIGHT / UNIT_HEIGHT);

    const img = await loadImage("./src/assets/images/leaderboard_background2.png");
    cctx.drawImage(img, 0, 0, UNIT_WIDTH, UNIT_HEIGHT);

    const drawText = (text: string, x: number, y: number, maxWidth?: number) => {
        cctx.shadowBlur = 6;
        cctx.shadowOffsetX = 2;
        cctx.strokeText(text, x, y, maxWidth);
        cctx.shadowOffsetX = 0;
        cctx.shadowBlur = 0;
        cctx.fillText(text, x, y, maxWidth);
    };

    // Header
    cctx.save();
    cctx.translate(0, 35);
    cctx.fillStyle = "white";
    cctx.textAlign = "center";
    cctx.font = "28px futura";
    cctx.strokeStyle = "black";
    cctx.shadowColor = "black";
    cctx.lineWidth = 1;
    cctx.shadowBlur = 4;
    cctx.shadowOffsetX = 0;
    cctx.strokeText(`Top Users | ${timePeriodStr}`, UNIT_WIDTH / 2, 0);
    cctx.shadowOffsetX = 0;
    cctx.shadowBlur = 0;
    cctx.fillText(`Top Users | ${timePeriodStr}`, UNIT_WIDTH / 2, 0);

    cctx.translate(0, 5);

    const startNum = pageNum * PAGE_SIZE + 1;
    const IMAGE_HEIGHT = 55;

    for (let i = 0; i < userScores.length; i++) {
        cctx.save();
        const { member, score } = userScores[i];
        const placeNum = startNum + i;

        // Place num
        cctx.translate(45, 10);
        cctx.textAlign = "end";
        cctx.font = "25px futura";
        cctx.fillStyle = "white";
        drawText(`${placeNum}`, 0, 34);

        // Avatar
        cctx.translate(10, 0);
        const avatarRes = await fetch(member.user.displayAvatarURL({ format: "png", size: 128 }));
        const avatar = await loadImage(await avatarRes.buffer());

        cctx.shadowBlur = 1;
        cctx.drawImage(avatar, 0, 0, IMAGE_HEIGHT, IMAGE_HEIGHT);

        // Top badge
        const userGold = new Counter({ identifier: member.user.id, title: "GoldCount" }); // Will exclude gold badges to save time
        const [firstBadge] = await badgeLoader(member, userGold, placeNum);

        cctx.drawImage(firstBadge, IMAGE_HEIGHT * 0.55, IMAGE_HEIGHT * 0.55, IMAGE_HEIGHT * 0.55, IMAGE_HEIGHT * 0.55);

        // Username
        cctx.translate(70, 0);
        cctx.fillStyle = "white";
        cctx.textAlign = "start";
        cctx.font = "34px futura";
        let displayedName = member.displayName.replace(/[^\w[\]()!@#%^&*-_+= ]/g, "").replace(/ {2,}/g, " ").trim() || member.displayName; // prettier-ignore
        let textInfo = cctx.measureText(displayedName);
        if (textInfo.width > 200 && member.user.username.length < displayedName.length) {
            displayedName = member.user.username;
            textInfo = cctx.measureText(displayedName);
        }

        drawText(displayedName, 0, 26, 200);
        // cctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        // drawText(displayedName, 0, 26, 200);

        // Level
        cctx.font = "20px futura";
        cctx.fillStyle = "white";
        drawText(`Level: ${calculateLevel(score)}`, 0, 55);

        // Score
        cctx.translate(325, 25);
        cctx.font = "28px FiraCode";
        cctx.textAlign = "end";
        drawText(`${score}`, 0, 0);

        cctx.restore();
        cctx.translate(0, 65);
    }

    // Page number
    cctx.restore();
    cctx.translate(0, UNIT_HEIGHT - 10);
    cctx.textAlign = "end";
    cctx.fillStyle = "white";
    cctx.font = "20px futura";
    drawText(`${pageNum + 1}`, UNIT_WIDTH - 10, 0);

    return canvas.toBuffer();
}
