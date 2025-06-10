import { channelIDs, roles } from "../../../Configuration/config";
import { Effect } from "effect";
import { checkHtml } from "./html";
import { checkHeaders } from "./headers";

export type BasicDataForWebsite = {
  url: string;
  displayName: string;
  roleId: (typeof roles.topfeed.selectable)[keyof typeof roles.topfeed.selectable];
  channelId: (typeof channelIDs.topfeed)[keyof typeof channelIDs.topfeed];
};
type DataForWebsite<A, E, R> = BasicDataForWebsite & {
  operator: (data: BasicDataForWebsite) => Effect.Effect<A, E, R>;
};

export const websitesToWatch = [
  {
    url: "http://dmaorg.info",
    displayName: "DMAORG 404 Page",
    roleId: roles.topfeed.selectable.dmaorg,
    channelId: channelIDs.topfeed.dmaorg,
    operator: checkHtml,
  },
  {
    url: "http://dmaorg.info/found/15398642_14/clancy.html",
    displayName: "DMAORG Clancy Page",
    roleId: roles.topfeed.selectable.dmaorg,
    channelId: channelIDs.topfeed.dmaorg,
    operator: checkHtml,
  },
  {
    url: "http://dmaorg.info/found/103_37/clancy.html",
    displayName: "DMAORG 103.37 Page",
    roleId: roles.topfeed.selectable.dmaorg,
    channelId: channelIDs.topfeed.dmaorg,
    operator: checkHtml,
  },
  {
    url: "http://dmaorg.info/found/103_37/Violation_Code_DMA-8325.mp4",
    displayName: "DMAORG Violation MP4",
    roleId: roles.topfeed.selectable.dmaorg,
    channelId: channelIDs.topfeed.dmaorg,
    operator: checkHeaders,
  },
  {
    url: "https://twentyonepilots.com/sitemap.xml",
    displayName: "Band Website Sitemap",
    roleId: roles.topfeed.selectable.band,
    channelId: channelIDs.topfeed.band,
    operator: checkHtml,
  },
] as const satisfies DataForWebsite<unknown, unknown, unknown>[];

export const fetchWebsites = Effect.gen(function* () {
  const websiteChecks = websitesToWatch.map((website) =>
    website.operator(website).pipe(
      Effect.catchAll((error) => Effect.logError(`Error checking website: ${error}`)),
      Effect.annotateLogs({ website: website.displayName }),
    ),
  );

  yield* Effect.all(websiteChecks, { mode: "either" });
});
