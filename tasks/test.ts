import { BufferResolvable } from "discord.js";
import { SacarverBot } from "../src/Altbots/welcome";
import { GlobalFonts } from "@napi-rs/canvas";

GlobalFonts.registerFromPath(`./src/Assets/fonts/f.ttf`, "Futura");
GlobalFonts.registerFromPath(`./src/Assets/fonts/FiraCode/Regular.ttf`, "FiraCode");
GlobalFonts.registerFromPath(`./src/Assets/fonts/ArialNarrow/Regular.ttf`, "'Arial Narrow'");


const attachment = await SacarverBot.generateWelcomeImage({
    memberNum: 1987,
    avatarUrl: "https://images-ext-1.discordapp.net/external/4Bl7gGIEe1WxeijqKR7U85-jgPFS0gLY8tt5kkRz_GE/https/cdn.discordapp.com/avatars/221465443297263618/24f74435e62c01c1ca79552032a85ad2.webp?format=webp",
    displayName: "poot",
    guildMemberCount: 456
});

const buffer = attachment.attachment as BufferResolvable;

await Bun.write("out.png", buffer);