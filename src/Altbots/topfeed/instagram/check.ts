import { userMention } from "discord.js";
import { channelIDs, userIDs } from "../../../Configuration/config";
import topfeedBot from "../topfeed";
import { fetchInstagram, usernamesToWatch } from "./fetch-and-send";

async function fetchOpengraphDataBackup(user: string) {
	const testChan = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
	if (!testChan || !testChan.isSendable())
		throw new Error("Test channel not found or is not text-based");

	const m = await testChan.send(
		`https://www.instagram.com/${user}?t=${Date.now()}`,
	);

	await new Promise((resolve) => setTimeout(resolve, 2_000));

	const fetchedMessage = await m.fetch(true);
	m.delete();

	if (fetchedMessage.embeds.length === 0) {
		throw new Error(`No OpenGraph data found for ${user}`);
	}
	const description = fetchedMessage.embeds[0].description;
	if (!description) {
		throw new Error(`No description found in OpenGraph data for ${user}`);
	}
	const postCountMatch = description.match(/(\d+) Posts/);
	if (!postCountMatch) {
		throw new Error(`No post count found in OpenGraph description for ${user}`);
	}
	return Number.parseInt(postCountMatch[1], 10);
}

async function fetchOpengraphData(user: string): Promise<number> {
	try {
		const data = await fetch(`https://www.instagram.com/${user}/embed`, {
			credentials: "omit",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Sec-GPC": "1",
				"Alt-Used": "www.instagram.com",
				"Upgrade-Insecure-Requests": "1",
				"Sec-Fetch-Dest": "iframe",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "cross-site",
				Priority: "u=6",
			},
			referrer: "https://www.discord.com/",
			method: "GET",
			mode: "cors",
		});

		const text = await data.text();

		const match = text.split('posts_count\\":')[1].split(",")[0];
		console.log(match);
		if (!match) {
			throw new Error("Failed to parse the number of posts from the response.");
		}
		const postCount = parseInt(match, 10);
		if (isNaN(postCount)) {
			throw new Error("Parsed post count is not a valid number.");
		}
		return postCount;
	} catch (error) {
		const testChan = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
		if (!testChan || !testChan.isTextBased())
			throw new Error("Test channel not found or is not text-based");
		const message =
			error instanceof Error
				? error.message
				: "Unknown error fetching Instagram opengraph data";
		console.error(
			`Error fetching Instagram opengraph data for ${user}:`,
			error,
		);
		await testChan.send(
			`${userMention(userIDs.me)} Error fetching Instagram opengraph data for ${user}: ${message}, trying backup method...`,
		);
		return fetchOpengraphDataBackup(user);
	}
}

const postCountMap: Record<(typeof usernamesToWatch)[number], number> = {
	twentyonepilots: 0,
	tylerrjoseph: 0,
	joshuadun: 0,
};

export async function checkInstagram() {
	const testChan = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
	if (!testChan || !testChan.isTextBased())
		throw new Error("Test channel not found or is not text-based");

	// First, check if the opengraph data shows that the number of posts has changed
	let postCountChanged = false;
	for (const username of usernamesToWatch) {
		try {
			const postCount = await fetchOpengraphData(username);
			if (postCountMap[username] !== postCount) {
				postCountChanged = true;
				if (postCountMap[username] !== 0) {
					console.log(
						`Post count for ${username} changed from ${postCountMap[username]} to ${postCount}`,
					);
					testChan
						.send(
							`${userMention(userIDs.me)} Post count for ${username} changed to ${postCount}`,
						)
						.catch(console.error);
				}
			} else {
				console.log(
					`Post count for ${username} has not changed (${postCount})`,
				);
			}
			postCountMap[username] = postCount;
		} catch (error) {
			console.error(`Error fetching opengraph data for ${username}:`, error);
			postCountChanged = true; // Assume it's changed if we can't fetch the data
			await testChan.send(
				`${userMention(userIDs.me)} Error fetching Instagram opengraph data for ${username}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	if (!postCountChanged && Math.random() < 0.05) {
		console.log(
			"No post changes detected, but randomly checking Instagram anyway.",
		);
	} else if (!postCountChanged) {
		console.log("No post count changes detected, skipping Instagram check.");
		return;
	}

	return fetchInstagram(postCountChanged ? "scheduled" : "random");
}
