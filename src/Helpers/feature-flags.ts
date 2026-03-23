import { flags as configFlags } from "../Configuration/config";
import { withCache } from "./cache";
import { prisma } from "./prisma-init";

export const FEATURE_FLAGS = Object.freeze({
  TB_ENABLED: "TB_ENABLED",
} as const);

export type FlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export async function isFlagEnabled(flagName: FlagName): Promise<boolean> {
  return withCache(
    `feature-flag:${flagName}`,
    async () => {
      const flag = await prisma.featureFlag.findUnique({
        where: { name: flagName },
      });

      if (flag) return flag.enabled;

      const defaultValue = (configFlags as Record<string, boolean>)[flagName] ?? false;
      return defaultValue;
    },
    5,
  );
}
