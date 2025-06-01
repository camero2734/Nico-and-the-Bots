import { APIComponentInContainer, ComponentType, ContainerBuilder, MessageFlags, roleMention, userMention } from 'discord.js';
import { IgApiClient, TimelineFeedResponseMedia_or_ad } from 'instagram-private-api';
import { channelIDs, roles, userIDs } from '../../../Configuration/config';
import secrets from '../../../Configuration/secrets';
import F from '../../../Helpers/funcs';
import { prisma } from '../../../Helpers/prisma-init';
import topfeedBot from '../topfeed';
import { addDays } from 'date-fns';

type InstagramMedia = { url: string; type: 'image' | 'video' };
interface FormattedInstagramPost {
  code: string;
  url: string;
  caption: string;
  author: string;
  authorImage: string;
  media: InstagramMedia[];
  postedAt: Date;
}
type DataForUsername = {
  roleId: typeof roles.topfeed.selectable[keyof typeof roles.topfeed.selectable];
  channelId: typeof channelIDs.topfeed[keyof typeof channelIDs.topfeed];
}

const usernamesToWatch = ['twentyonepilots', 'tylerrjoseph', 'joshuadun'] as const;
const usernameData: Record<typeof usernamesToWatch[number], DataForUsername>  = {
  "twentyonepilots": {
    roleId: roles.topfeed.selectable.band,
    channelId: channelIDs.topfeed.band,
  },
  "tylerrjoseph": {
    roleId: roles.topfeed.selectable.tyler,
    channelId: channelIDs.topfeed.tyler,
  },
  "joshuadun": {
    roleId: roles.topfeed.selectable.josh,
    channelId: channelIDs.topfeed.josh,
  },
}

const ig = new IgApiClient();
ig.state.generateDevice(secrets.apis.instagram.username);

let initialized = false;
async function initializeInstagram() {
  if (initialized) return;

  await ig.simulate.preLoginFlow().catch((error) => console.log('Pre-login flow error:', error?.message));
  const loggedInUser = await ig.account.login(secrets.apis.instagram.username, secrets.apis.instagram.password);
  void loggedInUser;

  await ig.simulate.postLoginFlow().catch((error) => console.log('Post-login flow error:', error?.message));
  initialized = true;
}

/**
 * Instagram provides this in the opengraph data:
 *     <meta property="og:description"
 *       content="0 Followers, 0 Following, 1 Posts - See Instagram photos and videos from USER" />
 * We use this to pull the number of posts.
 */
async function fetchOpengraphData(user: string) {
  const response = await fetch(`https://www.instagram.com/${user}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram page for ${user}`);
  }
  const text = await response.text();
  const descriptionMatch = text.match(/<meta property="og:description" content="([^"]+)"/);
  if (!descriptionMatch) {
    throw new Error(`No OpenGraph description found for ${user}`);
  }
  const description = descriptionMatch[1];
  const postCountMatch = description.match(/(\d+) Posts/);
  if (!postCountMatch) {
    throw new Error(`No post count found in OpenGraph description for ${user}`);
  }
  return Number.parseInt(postCountMatch[1], 10);
}

// Extract the best media URL from a post or carousel item
function extractMedia(item: TimelineFeedResponseMedia_or_ad): InstagramMedia[] {
  const media: InstagramMedia[] = [];

  const carouselMedia = item.carousel_media || [{ video_versions: item.video_versions, image_versions2: item.image_versions2 }];

  if (Array.isArray(carouselMedia)) {
    for (const mediaItem of carouselMedia) {
      if (Array.isArray(mediaItem.video_versions) && mediaItem.video_versions.length > 0) {
        const bestVideo = mediaItem.video_versions[0];
        media.push({ url: bestVideo.url, type: 'video' });
        continue;
      }

      const bestImage = mediaItem.image_versions2!.candidates.sort((a, b) => b.width - a.width)[0];
      media.push({ url: bestImage.url, type: 'image' });
    }
  }

  return media;
}

const postCountMap: Record<typeof usernamesToWatch[number], number> = {
  "twentyonepilots": 0,
  "tylerrjoseph": 0,
  "joshuadun": 0,
};

export async function checkInstagram() {
  const testChan = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  // First, check if the opengraph data shows that the number of posts has changed
  let postCountChanged = false;
  for (const username of usernamesToWatch) {
    try {
      await testChan.send(`Checking Instagram post count for ${username}`).catch(console.error);
      const postCount = await fetchOpengraphData(username);
      if (postCountMap[username] !== postCount) {
        postCountChanged = true;
        if (postCountMap[username] !== 0) {
          console.log(`Post count for ${username} changed to ${postCount}`);
          testChan.send(`${userMention(userIDs.me)} Post count for ${username} changed to ${postCount}`).catch(console.error);
        }
      } else {
        console.log(`Post count for ${username} has not changed (${postCount})`);
      }
      postCountMap[username] = postCount;
    } catch (error) {
      console.error(`Error fetching opengraph data for ${username}:`, error);
      postCountChanged = true; // Assume it's changed if we can't fetch the data
      await testChan.send(`${userMention(userIDs.me)} Error fetching Instagram opengraph data for ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (!postCountChanged) {
    console.log("No post count changes detected, skipping Instagram check.");
    await testChan.send(`${userMention(userIDs.me)} No post count changes detected, skipping Instagram check.`);
    return;
  }

  try {
    await initializeInstagram();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during Instagram initialization';
    console.error(error);
    await testChan.send(`${userMention(userIDs.me)} Error initializing Instagram: ${message}`);
    return
  }

  await testChan.send(`[scheduled] Fetching recent IG posts`).catch(console.error);

  try {
    const feed = ig.feed.timeline("warm_start_fetch");
    const items = await feed.items({ pagination_source: 'following' });

    const formattedPosts: FormattedInstagramPost[] = items
      .filter((item) => !item.ad_id)
      .map(item => {
        const captionText = item?.caption?.text || '*No caption*';
        const authorName = item?.user?.username || 'Unknown Author';

        // Create the formatted post object
        return {
          code: item.code,
          url: `https://instagram.com/p/${item.code}`,
          caption: captionText,
          author: authorName,
          media: extractMedia(item),
          postedAt: new Date(item.taken_at * 1000),
          authorImage: item.user.profile_pic_url,
        };
      });

    for (const post of formattedPosts) {
      await sendInstagramPost(post);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during Instagram feed fetch';
    console.error(error);
    await testChan.send(`${userMention(userIDs.me)} Error fetching Instagram feed: ${message}`);
  }
}

async function sendInstagramPost(post: FormattedInstagramPost) {
  const testChan = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  if (!usernamesToWatch.includes(post.author as typeof usernamesToWatch[number])) {
    console.log(`Skipping post from ${post.author} as they are not in the watchlist.`);
    return;
  }

  const existing = await prisma.topfeedPost.findFirst({
    where: {
      type: "Instagram",
      handle: post.author,
      id: post.code,
    }
  });

  if (existing) {
    console.log(`IG post ${post.code} from ${post.author} already exists in the database.`);
    return; // Skip if post already exists
  }

  if (addDays(new Date(post.postedAt), 1) < new Date()) {
    console.log(`Skipping IG post ${post.code} from ${post.author} as it is old.`);
    await testChan.send(`Skipping IG post ${post.url} from ${post.author} as it is old.`).catch(console.error);
    return;
  }

  console.log(`Processing IG post ${post.code} from ${post.author}`);
  console.log(JSON.stringify(post, null, 2));

  await testChan.send(`Processing IG post ${post.url} from ${post.author}`).catch(console.error);

  const { roleId, channelId } = usernameData[post.author as typeof usernamesToWatch[number]];
  void channelId;
  const components = await instaPostToComponents(post, roleId);

  const channel = await topfeedBot.guild.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    throw new Error("Channel not found or is not text-based");
  }

  await prisma.topfeedPost.create({
    data: {
      id: post.code,
      type: "Instagram",
      handle: post.author,
      data: { ...post },
    },
  });

  await channel.send({
    components: [components],
    flags: MessageFlags.IsComponentsV2,
  });
}

export async function instaPostToComponents(post: FormattedInstagramPost, roleId: string) {
  // Compose author line
  const authorLine = `**[${post.author}](https://instagram.com/${post.author})**`;

  const role = await topfeedBot.guild.roles.fetch(roleId);
  if (!role) throw new Error(`Role with ID ${roleId} not found`);

  // Compose main post section
  const mainSection: APIComponentInContainer[] = [
    {
      type: ComponentType.Section,
      accessory: {
        type: ComponentType.Thumbnail,
        media: {
          url: post.authorImage,
        }
      },
      components: [{
        type: ComponentType.TextDisplay,
        content: authorLine,
      }],
    },
    {
      type: ComponentType.TextDisplay,
      content: post.caption,
    },
    {
      type: ComponentType.TextDisplay,
      content: `[View on Instagram](${post.url})`,
    },
  ];

  // Compose media gallery section
  const mediaSection: APIComponentInContainer[] =
    post.media.length > 0
      ? [
          {
            type: ComponentType.Separator,
            divider: false,
            spacing: 1,
          },
          {
            type: ComponentType.MediaGallery,
            items: post.media.map((mediaItem) => ({
              media: { url: mediaItem.url }
            })).slice(0, 10), // Limit to 10 items
          },
        ]
      : [];

  const footerSection: APIComponentInContainer[] = [{
    type: ComponentType.TextDisplay,
    content: `-# ${roleMention(roleId)} | Posted ${F.discordTimestamp(new Date(post.postedAt), "relative")}`,
  }];

  // Build the container
  const container = new ContainerBuilder({
    components: [
      ...mainSection,
      ...mediaSection,
      ...footerSection,
    ],
    accent_color: role.color,
  });

  return container;
}