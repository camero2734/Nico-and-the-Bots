import { ColorResolvable, Snowflake } from "discord.js";
import { roles } from "../../../../Configuration/config";
import F from "../../../../Helpers/funcs";

export interface Change {
	from: ColorResolvable;
	to: ColorResolvable;
}

const colors = {
	...roles.colors.tier1,
	...roles.colors.tier2,
	...roles.colors.tier3,
	...roles.colors.tier4,
	...roles.colors.DExclusive,
}; // prettier-ignore

const _changes: Partial<Record<keyof typeof colors, Change>> = {
	"Rebel Red": { from: "#ff0060", to: "#D30E3B" },
	"The Red and Go": { from: "#e86a6e", to: "#E74F54" },
	"Pink You Out": { from: "#ff1493", to: "#EEB8DD" },
	"Kitchen Pink": { from: "#ff9dae", to: "#C54B8C" },
	"Ned Blue": { from: "#c6e2ff", to: "#008FA2" },
	"Regional at Blue": { from: "#aebfd8", to: "#6485A9" },
	"Pet Cheetah Purple": { from: "#7113bd", to: "#BB80FF" },
};

export const changes = Object.fromEntries(
	F.entries(_changes).map(([key, value]) => [colors[key], value]),
) as Record<Snowflake, Change>;
