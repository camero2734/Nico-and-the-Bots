import { createCanvas, loadImage } from "@napi-rs/canvas";
import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { badgeLoader } from "../../../Helpers";
import { prisma, queries } from "../../../Helpers/prisma-init";
import { LevelCalculator } from "../../../Helpers/score-manager";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const PAGE_SIZE = 10;

const timePeriodChoices = <const>[
    { name: "Last week", value: 1 },
    { name: "Last month", value: 4 },
    { name: "Last 3 months", value: 13 },
    { name: "Last 6 months", value: 26 },
    { name: "Last year", value: 52 },
    { name: "All time", value: 0 }
];

const command = new SlashCommand({
    description: "Displays the server point leaderboard",
    options: [
        {
            name: "page",
            description: "The page number of the leaderboard to check",
            required: false,
            type: ApplicationCommandOptionType.Integer,
            choices: []
        },
        {
            name: "timeperiod",
            description: "The time period over which to display statistics. Defaults to 1 month.",
            required: false,
            type: ApplicationCommandOptionType.Integer,
            choices: timePeriodChoices
        }
    ]
});

command.setHandler(async (ctx) => {
    const { page } = ctx.opts;
    const pageNum = Math.floor(page && page >= 1 ? page - 1 : 0); // Computers tend to like to start at zero. Also negative pages don't make sense
    const timeperiod = ctx.opts.timeperiod || 0;

    await ctx.deferReply();

    const memberScores =
        timeperiod === 0 ? await getAlltimeScores(ctx, pageNum) : await getMemberScores(ctx, pageNum, timeperiod);

    if (memberScores.length === 0) throw new CommandError("This page doesn't exist!");

    const choice = timePeriodChoices.find((c) => c.value === timeperiod);
    const timePeriodStr = (timeperiod && choice?.name) || "All time";

    const buffer = await generateImage(memberScores, pageNum, timePeriodStr);

    await ctx.send({
        embeds: [],
        files: [{ name: `top-over${timeperiod || 0}-page${pageNum}.png`, attachment: buffer }]
    });
});
async function getMemberScores(
    ctx: typeof command.ContextType,
    pageNum: number,
    timeperiod?: number
): Promise<{ member?: GuildMember; score: number }[]> {
    const startAt = pageNum * 10;
    const paginatedUsers = await queries.scoresOverTime(timeperiod, startAt, 10);

    return await Promise.all(
        paginatedUsers.map(async (u) => ({
            member: await ctx.member.guild.members.fetch(u.userId.toSnowflake()).catch(() => undefined),
            score: u.score
        }))
    );
}

async function getMembersThatLeft(
    ctx: typeof command.ContextType,) {
        const allUserIds = await prisma.user.findMany({
            select: { id: true }
        });
        const allUserIdsSet = new Set(allUserIds.map((u) => u.id));

        const members = await ctx.member.guild.members.fetch();
        const memberIdsSet = new Set(members.map((m) => m.id));
        return [...allUserIdsSet.difference(memberIdsSet)];
    }

async function getAlltimeScores(
    ctx: typeof command.ContextType,
    pageNum: number
): Promise<{ member?: GuildMember; score: number }[]> {
    const startAt = pageNum * 10;

    const start = Date.now();
    const excludedMembers = await getMembersThatLeft(ctx);
    console.log("Time taken to get members that left: ", Date.now() - start);

    const start2 = Date.now();
    const paginatedUsers = await prisma.user.findMany({
        orderBy: { score: "desc" },
        where: {
            id: { notIn: excludedMembers }
        },
        skip: startAt,
        take: 10
    });
    console.log("Time taken to get paginated users: ", Date.now() - start2);

    return await Promise.all(
        paginatedUsers.map(async (u) => {
            return {
                member: await ctx.member.guild.members.fetch(u.id.toSnowflake()).catch(() => undefined),
                score: u.score
            };
        })
    );
}

async function generateImage(
    userScores: { member?: GuildMember; score: number }[],
    pageNum: number,
    timePeriodStr: string
): Promise<Buffer> {
    const ACTUAl_WIDTH = 1000;
    const ACTUAL_HEIGHT = 1400;

    const UNIT_WIDTH = 500;
    const UNIT_HEIGHT = 700;

    const canvas = createCanvas(ACTUAl_WIDTH, ACTUAL_HEIGHT);
    const cctx = canvas.getContext("2d");

    cctx.scale(ACTUAl_WIDTH / UNIT_WIDTH, ACTUAL_HEIGHT / UNIT_HEIGHT);

    const img = await loadImage("./src/Assets/images/leaderboard_background2.png");
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
    cctx.font = "28px Futura";
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
        cctx.font = "25px Futura";
        cctx.fillStyle = "white";
        drawText(`${placeNum}`, 0, 34);

        // Avatar
        cctx.translate(10, 0);
        const avatar = await loadImage(
            member?.user.displayAvatarURL({ extension: "png", size: 128 }) ||
            "https://cdn.landesa.org/wp-content/uploads/default-user-image.png"
        );

        cctx.shadowBlur = 1;
        cctx.drawImage(avatar, 0, 0, IMAGE_HEIGHT, IMAGE_HEIGHT);

        // Top badge
        const [firstBadge] = member
            ? await badgeLoader(member, { placeNum, numBadges: 1 })
            : [await loadImage("./src/Assets/badges/banditos.png")];

        cctx.drawImage(firstBadge, IMAGE_HEIGHT * 0.55, IMAGE_HEIGHT * 0.55, IMAGE_HEIGHT * 0.55, IMAGE_HEIGHT * 0.55);

        // Username
        cctx.translate(70, 0);
        cctx.fillStyle = "white";
        cctx.textAlign = "start";
        cctx.font = "34px Futura";
        let displayedName = member?.displayName.replace(/[^\w[\]()!@#%^&*-_+= ]/g, "").replace(/ {2,}/g, " ").trim() || member?.displayName || "Missing user"; // prettier-ignore
        let textInfo = cctx.measureText(displayedName);
        if (member && textInfo.width > 200 && member.user.username.length < displayedName.length) {
            displayedName = member.user.username;
            textInfo = cctx.measureText(displayedName);
        }

        drawText(displayedName, 0, 26, 200);
        // cctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        // drawText(displayedName, 0, 26, 200);

        // Level
        cctx.font = "20px Futura";
        cctx.fillStyle = "white";
        drawText(`Level: ${LevelCalculator.calculateLevel(score)}`, 0, 55);

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
    cctx.font = "20px Futura";
    drawText(`${pageNum + 1}`, UNIT_WIDTH - 10, 0);

    return canvas.toBuffer('image/png');
}

export default command;
