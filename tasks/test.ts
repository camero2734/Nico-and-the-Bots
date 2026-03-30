import { fm } from "../src/InteractionEntrypoints/slashcommands/fm/_consts";

const res = await fm.user.getTopArtists({ username: 'pootusmaximus', limit: 1000 });

await Bun.file("test.json").write(JSON.stringify(res, null, 2));

console.dir(res, { depth: null });
