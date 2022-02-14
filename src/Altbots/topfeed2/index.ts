import { secondsToMilliseconds } from "date-fns";
import { Embed, MessageOptions } from "discord.js/packages/discord.js";
import { guild } from "../../../app";
import { channelIDs, roles } from "../../Configuration/config";
import { prisma } from "../../Helpers/prisma-init";
import { TopfeedService } from "./service";
import { TopfeedSource } from "./source";
import { TwitterSource } from "./sources/twitter";

const TylerInfo = <const>{
    displayName: "Tyler Joseph",
    channelId: channelIDs.topfeed.tyler,
    roleId: roles.topfeed.selectable.tyler
};

const sources: TopfeedSource[] = [
    new TwitterSource({ ...TylerInfo, handle: "tylerrjoseph" })
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
    new TopfeedService(sources, guild).run();
}
