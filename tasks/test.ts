import { KeonsBot } from "../src/Altbots/shop";

const b = new KeonsBot();

await b.setupShop();

console.log("Done");

// const client = new Client({
//   intents: [
//     "Guilds",
//     "DirectMessages",
//     "DirectMessageReactions",
//     "GuildBans",
//     "GuildEmojisAndStickers",
//     "GuildMembers",
//     "GuildMessages",
//     "GuildIntegrations",
//     "GuildInvites",
//     "GuildPresences",
//     "GuildVoiceStates",
//     "GuildWebhooks",
//   ],
// });

// client.on(Events.ClientReady, () => {
//   console.log("ClientReady event fired");
// });

// client.on(Events.Error, (err: Error) => {
//   console.error("Client error:", err);
// });

// await client.login(secrets.bots.keons);
// console.log("Login attempted");

