import { parseISO } from "date-fns";
import { type BaseMessageOptions, EmbedBuilder } from "discord.js";
import Youtube from "youtube.ts";
import secrets from "../../../Configuration/secrets";
import { type Checked, Watcher } from "./base";

type YoutubeType = {
	url: string;
	date: Date;
	thumbnail: string;
	description: string;
};

const YOUTUBE_IMG =
	"https://www.iconpacks.net/icons/2/free-youtube-logo-icon-2431-thumb.png";
const youtube = new Youtube(secrets.apis.google.youtube);

export class YoutubeWatcher extends Watcher<YoutubeType> {
	type = "Youtube" as const;
	async fetchRecentItems(): Promise<Checked<YoutubeType>[]> {
		const channel = await youtube.channels.get(
			`https://www.youtube.com/user/${this.handle}`,
			{
				part: "contentDetails",
			},
		);

		const uploadPlaylist = channel.contentDetails.relatedPlaylists.uploads;

		const { items: videos } = await youtube.playlists.items(uploadPlaylist, {
			maxResults: "5",
			part: "snippet,id",
		});

		return videos.map((v) => ({
			uniqueIdentifier: v.snippet.resourceId.videoId,
			ping: true,
			_data: {
				url: `https://www.youtube.com/watch?v=${v.snippet.resourceId.videoId}`,
				date: parseISO(v.snippet.publishedAt),
				thumbnail: v.snippet.thumbnails.high.url,
				description: v.snippet.description,
			},
		}));
	}

	async generateMessages(
		checkedItems: Checked<YoutubeType>[],
	): Promise<BaseMessageOptions[][]> {
		return checkedItems.map((item) => {
			const embed = new EmbedBuilder()
				.setAuthor({
					name: `New Youtube video from ${this.handle}`,
					iconURL: YOUTUBE_IMG,
					url: item._data.url,
				}) // prettier-ignore
				.setThumbnail(item._data.thumbnail)
				.setDescription(item._data.description.substring(0, 250))
				.setColor(0xff0000);

			const infoMsg: BaseMessageOptions = { embeds: [embed] };
			const ytMsg: BaseMessageOptions = { content: item._data.url };
			return [infoMsg, ytMsg];
		});
	}
}
