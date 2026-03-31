import { ContainerBuilder, SectionBuilder, SeparatorBuilder, TextDisplayBuilder } from "@discordjs/builders";
import { ApplicationCommandOptionType, MessageFlags, SeparatorSpacingSize } from "discord.js";
import ordinal from "ordinal";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { fm } from "./_consts";

const ITEMS_PER_PAGE = 10;

const command = new SlashCommand({
  description: "Displays members in the server who have listened to the specified artist",
  options: [
    {
      name: "artist",
      description: "The artist to lookup",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "page",
      description: "The page number to view",
      required: false,
      type: ApplicationCommandOptionType.Integer,
    },
  ],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  const artistQuery = ctx.opts.artist;
  const page = ctx.opts.page ?? 1;

  if (page < 1) {
    throw new CommandError("Page number must be at least 1.");
  }

  const searchResult = await fm.artist.search({ artist: artistQuery, limit: 1 });

  if (!searchResult.results.artistmatches || searchResult.results.artistmatches.artist.length === 0) {
    throw new CommandError(`No artist found matching "${artistQuery}".`);
  }

  const artist = searchResult.results.artistmatches.artist[0];

  const artistNameLower = artist.name.toLowerCase();
  const possibleKeys = artist.mbid ? [artist.mbid, artistNameLower] : [artistNameLower];

  const artistImage = await fm.artist
    .getInfo({
      artist: artist.name,
      mbid: artist.mbid,
      username: "fjisdijgsd8gsdijidgos",
    })
    .then((info) => info.artist.image?.at(-1)?.["#text"]);

  const [countResult, pageUsers] = await prisma.$transaction([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "UserLastFM" ulf
      JOIN "User" u ON ulf."userId" = u.id
      WHERE ulf."topArtists" ?| ${possibleKeys}
        AND u."currentlyInServer" = true
    `,
    prisma.$queryRaw<Array<{ username: string; userId: string; scrobbles: bigint }>>`
      SELECT ulf.username, ulf."userId", 
        COALESCE(
          (ulf."topArtists"->> ${artist.mbid || artistNameLower})::bigint,
          (ulf."topArtists"->> ${artistNameLower})::bigint
        ) AS scrobbles
      FROM "UserLastFM" ulf
      JOIN "User" u ON ulf."userId" = u.id
      WHERE ulf."topArtists" ?| ${possibleKeys}
        AND u."currentlyInServer" = true
      ORDER BY scrobbles DESC
      LIMIT ${ITEMS_PER_PAGE}
      OFFSET ${(page - 1) * ITEMS_PER_PAGE}
    `,
  ]);

  console.log({
    possibleKeys,
    countResult,
    pageUsers,
  });

  const totalListeners = Number(countResult[0].count);
  const totalPages = Math.ceil(totalListeners / ITEMS_PER_PAGE);

  if (totalListeners === 0) {
    throw new CommandError(`No one in this server has listened to **${artist.name}** yet.`);
  }

  if (page > totalPages) {
    throw new CommandError(
      `Page ${page} does not exist. There are ${totalPages} page${totalPages === 1 ? "" : "s"} available.`,
    );
  }

  const totalScrobblesResult = await prisma.$queryRaw<{ sum: bigint }[]>`
    SELECT COALESCE(SUM(
      COALESCE(
        (ulf."topArtists"->> ${artist.mbid || artistNameLower})::bigint,
        (ulf."topArtists"->> ${artistNameLower})::bigint
      )
    ), 0) as sum
    FROM "UserLastFM" ulf
    JOIN "User" u ON ulf."userId" = u.id
    WHERE ulf."topArtists" ?| ${possibleKeys}
      AND u."currentlyInServer" = true
  `;
  const totalScrobbles = Number(totalScrobblesResult[0].sum);

  const startIndex = (page - 1) * ITEMS_PER_PAGE;

  const currentUserFm = await prisma.userLastFM.findUnique({
    where: { userId: ctx.member.id },
  });

  let currentUserRank: { rank: number; scrobbles: number; username: string } | null = null;
  if (currentUserFm) {
    const userScrobbles = await prisma.$queryRaw<{ scrobbles: bigint; rank: bigint }[]>`
      SELECT COALESCE(
        (ulf."topArtists"->> ${artist.mbid || artistNameLower})::bigint,
        (ulf."topArtists"->> ${artistNameLower})::bigint
      ) AS scrobbles,
      (
        SELECT COUNT(*) + 1
        FROM "UserLastFM" ulf2
        JOIN "User" u2 ON ulf2."userId" = u2.id
        WHERE ulf2."topArtists" ?| ${possibleKeys}
          AND u2."currentlyInServer" = true
          AND COALESCE(
            (ulf2."topArtists"->> ${artist.mbid || artistNameLower})::bigint,
            (ulf2."topArtists"->> ${artistNameLower})::bigint
          ) > COALESCE(
            (ulf."topArtists"->> ${artist.mbid || artistNameLower})::bigint,
            (ulf."topArtists"->> ${artistNameLower})::bigint
          )
      ) AS rank
      FROM "UserLastFM" ulf
      WHERE ulf."userId" = ${ctx.member.id}
        AND ulf."topArtists" ?| ${possibleKeys}
    `;

    if (userScrobbles.length > 0 && userScrobbles[0].scrobbles !== null) {
      currentUserRank = {
        rank: Number(userScrobbles[0].rank),
        scrobbles: Number(userScrobbles[0].scrobbles),
        username: currentUserFm.username,
      };
    }
  }

  const pageUserIds = new Set(pageUsers.map((u) => u.userId));
  const isCurrentUserOnPage = currentUserRank && pageUserIds.has(ctx.member.id);

  const container = new ContainerBuilder().setAccentColor(0xb90000);

  const headerSection = new SectionBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${artist.name}\nWho knows this artist?`),
  );

  if (artistImage) {
    headerSection.setThumbnailAccessory((builder) => builder.setURL(artistImage));
  }

  container.addSectionComponents(headerSection);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const rankingLines = pageUsers.map((user, index) => {
    const rank = startIndex + index + 1;
    const scrobbles = Number(user.scrobbles);
    const formattedRank = ordinal(rank);
    const isCurrentUser = user.userId === ctx.member.id;
    const star = isCurrentUser ? " ⭐" : "";
    const memberName = ctx.guild.members.cache.get(user.userId)?.displayName || `<@${user.userId}>`;

    return `**${formattedRank}**${star} ${memberName}\n-# [\`${user.username}\`](https://www.last.fm/user/${user.username}) · ${scrobbles.toLocaleString()} scrobble${scrobbles === 1 ? "" : "s"}`;
  });

  if (currentUserRank && !isCurrentUserOnPage) {
    const star = " ⭐";
    const memberName = ctx.guild.members.cache.get(ctx.member.id)?.displayName || `<@${ctx.member.id}>`;
    const rankLine = `**${ordinal(currentUserRank.rank)}**${star} ${memberName}\n-# [\`${currentUserRank.username}\`](https://www.last.fm/user/${currentUserRank.username}) · ${currentUserRank.scrobbles.toLocaleString()} scrobble${currentUserRank.scrobbles === 1 ? "" : "s"}`;
    rankingLines.push(rankLine);
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(rankingLines.join("\n")));

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const footerContent = [
    `**${totalScrobbles.toLocaleString()}** total scrobbles from **${totalListeners.toLocaleString()}** listener${totalListeners === 1 ? "" : "s"}`,
    `-# Page ${page}/${totalPages}`,
  ].join("\n");

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(footerContent));

  await ctx.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
});

export default command;
