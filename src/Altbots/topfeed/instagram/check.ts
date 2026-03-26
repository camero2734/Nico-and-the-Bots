import { channelIDs } from "../../../Configuration/config";
import {
  addElement,
  createBackgroundEvent,
  emitWideEvent,
  finalizeWideEvent,
  type WideEvent,
} from "../../../Helpers/logging/wide-event";
import { keonsGuild } from "../topfeed";
import { fetchInstagram, usernamesToWatch } from "./fetch-and-send";

async function fetchOpengraphDataBackup(user: string) {
  const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isSendable()) throw new Error("Test channel not found or is not text-based");

  const m = await testChan.send(`https://www.instagram.com/${user}?t=${Date.now()}`);

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

let lastWrittenAt = 0;
async function fetchOpengraphData(user: string, wideEvent: WideEvent): Promise<number> {
  let text: string | undefined;
  try {
    const data = await fetch(`https://www.instagram.com/${user}/embed`, {
      credentials: "omit",
      headers: {
        "User-Agent": "PostmanRuntime/7.32.3",
        Accept: "*/*",
        "Cache-Control": "no-cache",
        Host: "www.instagram.com",
      },
      method: "GET",
    });

    text = await data.text();

    const match = text?.split('posts_count\\":')?.[1]?.split(",")?.[0];
    if (!match) {
      if (Date.now() - lastWrittenAt > 1000 * 60) {
        lastWrittenAt = Date.now();
        await Bun.file("instagram_opengraph_debug.html").write(text);
      }
      throw new Error("Failed to parse the number of posts from the response.");
    }
    const postCount = Number.parseInt(match, 10);
    if (Number.isNaN(postCount)) {
      throw new Error("Parsed post count is not a valid number.");
    }
    return postCount;
  } catch (error) {
    const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
    if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

    const message = error instanceof Error ? error.message : "Unknown error fetching Instagram opengraph data";
    addElement(wideEvent.extended.opengraph_errors, `${user}: ${message}`);
    addElement(wideEvent.extended.used_backup_methods, user);

    await testChan.send(`Error fetching Instagram opengraph data for ${user}: ${message}, trying backup method...`);
    return fetchOpengraphDataBackup(user);
  }
}

const postCountMap: Record<(typeof usernamesToWatch)[number], number> = {
  twentyonepilots: 0,
  tylerrjoseph: 0,
  joshuadun: 0,
};

export async function checkInstagram() {
  const wideEvent = createBackgroundEvent("instagram_check");

  try {
    const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
    if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

    const postCounts: Record<string, number> = {};
    let postCountChanged = false;

    for (const username of usernamesToWatch) {
      try {
        const postCount = await fetchOpengraphData(username, wideEvent);
        postCounts[username] = postCount;
        if (postCountMap[username] !== postCount) {
          postCountChanged = true;
          if (postCountMap[username] !== 0) {
            await testChan.send(`Post count for ${username} changed to ${postCount}`).catch(() => { });
          }
        }
        postCountMap[username] = postCount;
      } catch (error) {
        postCountChanged = true;
        addElement(wideEvent.extended.fetch_errors, username);
        await testChan.send(
          `Error fetching Instagram opengraph data for ${username}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    wideEvent.extended.post_counts = postCounts;
    wideEvent.extended.post_count_changed = postCountChanged;

    if (!postCountChanged && Math.random() < 0.05) {
      wideEvent.extended.random_check = true;
    }

    if (!postCountChanged) {
      finalizeWideEvent(wideEvent, "success");
      emitWideEvent(wideEvent);
      return;
    }

    await fetchInstagram(postCountChanged ? "scheduled" : "random", wideEvent);
    finalizeWideEvent(wideEvent, "success");
  } catch (error) {
    finalizeWideEvent(wideEvent, "error", error);
    throw error;
  }

  emitWideEvent(wideEvent);
}
