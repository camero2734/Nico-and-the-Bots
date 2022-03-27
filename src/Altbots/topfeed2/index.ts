import { secondsToMilliseconds } from "date-fns";
import { Embed, MessageOptions } from "discord.js";
import { guild } from "../../../app";
import { channelIDs, roles } from "../../Configuration/config";
import { prisma } from "../../Helpers/prisma-init";
import { TopfeedService } from "./service";
import { TopfeedSource } from "./source";
import { TiktokSource } from "./sources/tiktok";
import { TwitterSource } from "./sources/twitter";

const TylerInfo = <const>{
    displayName: "Tyler Joseph",
    channelId: channelIDs.topfeed.tyler,
    roleId: roles.topfeed.selectable.tyler
};

const BandInfo = <const>{
    displayName: "twenty one pilots",
    channelId: channelIDs.topfeed.band,
    roleId: roles.topfeed.selectable.band
};

const sources: TopfeedSource[] = [
    // new TwitterSource({ ...TylerInfo, handle: "tylerrjoseph" }),
    new TiktokSource({ ...BandInfo, username: "twentyonepilots" })
    // new InstagramSource({ ...TylerInfo, username: "tylerrjoseph" }),
    // new TiktokSource({ ...TylerInfo, username: "tylerrjoseph" }),
    // new WebsiteSource({
    //     displayName: "DMAORG Root Page",
    //     channelID: channelIDs.topfeed.dmaorg,
    //     roleId: roles.topfeed.selectable.dmaorg,
    //     url: "https://dmaorg.info/"
    // })
];

export function startTopfeed() {
    console.log("starting");
    new TopfeedService(sources, guild).run();
}
