import { fm } from "../src/InteractionEntrypoints/slashcommands/fm/_consts";

const res = await fm.album.getInfo({
  album: "Blurryface",
  artist: "Twenty One Pilots",
  username: "pootusmaximus",
});

console.log(res, /RES/);