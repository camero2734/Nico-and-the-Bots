import { fm } from "../src/InteractionEntrypoints/slashcommands/fm/_consts";

const searchResult = await fm.artist.search({ artist: "twenty one pilots", limit: 1 });

const artist = searchResult.results.artistmatches.artist[0];
const artistResult = await fm.artist.getInfo({
  artist: artist.name,
  mbid: artist.mbid,
  username: "fjisdijgsd8gsdijidgos"
});
console.log(artistResult.artist.image);