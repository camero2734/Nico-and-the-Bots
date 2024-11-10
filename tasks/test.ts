import { BufferResolvable } from "discord.js";
import { SacarverBot } from "../src/Altbots/welcome";
import { GlobalFonts } from "@napi-rs/canvas";

GlobalFonts.registerFromPath(`./src/Assets/fonts/f.ttf`, "Futura");
GlobalFonts.registerFromPath(`./src/Assets/fonts/FiraCode/Regular.ttf`, "FiraCode");
GlobalFonts.registerFromPath(`./src/Assets/fonts/ArialNarrow/Regular.ttf`, "'Arial Narrow'");
GlobalFonts.registerFromPath(`./src/Assets/fonts/clancy.otf`, "Clancy");

const attachment = await SacarverBot.generateWelcomeImage({
    memberNum: 1987,
    avatarUrl: "https://images-ext-1.discordapp.net/external/_N3TF6XlCx7jGZ8NUfv14MnUihQdbA9y1MbEBfK_d9k/https/cdn.discordapp.com/avatars/470691679712706570/39c96b8e460b356c723fa088f27d4360.webp?format=webp",
    displayName: "username 😄😄😄",
    guildMemberCount: 456
});

const buffer = attachment.attachment as BufferResolvable;

await Bun.write("out.webp", buffer);