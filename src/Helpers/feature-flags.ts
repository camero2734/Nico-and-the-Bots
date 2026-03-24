import { withCache } from "./cache";
import { prisma } from "./prisma-init";

export const FEATURE_FLAGS = Object.freeze({
  TB_V2: "TB_V2",
  ACCEPT_TB_APPLICATIONS: "ACCEPT_TB_APPLICATIONS",
} as const);

export type FlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export async function isFlagEnabled(flagName: FlagName): Promise<boolean> {
  return withCache(
    `feature-flag:${flagName}`,
    async () => {
      const flag = await prisma.featureFlag.findUnique({
        where: { name: flagName },
      });

      return flag?.enabled ?? false;
    },
    5,
  );
}
