import { APIComponentInContainer, ComponentType, ContainerBuilder, MessageFlags, roleMention, userMention } from 'discord.js';
import { IgApiClient, TimelineFeedResponseMedia_or_ad } from 'instagram-private-api';
import { channelIDs, roles, userIDs } from '../../../Configuration/config';
import secrets from '../../../Configuration/secrets';
import F from '../../../Helpers/funcs';
import { prisma } from '../../../Helpers/prisma-init';
import topfeedBot from '../topfeed';
import { addDays } from 'date-fns';

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

const usernamesToWatch = ['twentyonepilots', 'tylerrjoseph', 'joshuadun'];

type DataForUsername = {
  roleId: typeof roles.topfeed.selectable[keyof typeof roles.topfeed.selectable];
  channelId: typeof channelIDs.topfeed[keyof typeof channelIDs.topfeed];
}

const usernameData: Record<typeof usernamesToWatch[number], DataForUsername>  = {
  "pootusmaximus": {
    roleId: "572568489320120353" as any,
    channelId: channelIDs.bottest as any,
  },
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

export async function checkInstagram() {
  const testChan = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

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

  if (!usernamesToWatch.includes(post.author)) {
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

  const { roleId, channelId } = usernameData[post.author];
  void channelId;
  const components = await instaPostToComponents(post, roleId);

  // const channel = await topfeedBot.guild.channels.fetch(channelId);
  const channel = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
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
    allowedMentions: { parse: [] },
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