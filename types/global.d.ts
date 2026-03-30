import "discord.js";

declare module "discord.js" {
  interface EmbedBuilder {
    toJSON(): Record<string, unknown>;
  }
}

declare global {
  namespace PrismaJson {
    /** Map of LastFM artist names to their playcounts */
    type LastFMTopArtists = Record<string, number>;
  }
}
