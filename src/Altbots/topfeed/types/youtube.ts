import { MessageEmbed, MessageOptions } from "discord.js";
import secrets from "../../../Configuration/secrets";
import { Checked, Watcher } from "./base";

type YoutubeType = {
    url: string;
    images: string[];
    caption?: string;
    date: Date;
};

export class YoutubeWatcher extends Watcher<YoutubeType> {
    type = "Instagram" as const;
    async fetchRecentItems(): Promise<Checked<YoutubeType>[]> {
        return [];
    }

    async generateMessages(checkedItems: Checked<YoutubeType>[]): Promise<MessageOptions[][]> {
        return checkedItems.map((item) => {
            return [];
        });
    }
}
