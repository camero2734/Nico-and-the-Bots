import { format, hoursToSeconds, minutesToSeconds } from "date-fns";
const HOURS_IN_YEAR = 24 * 365;

export const REMINDER_LIMIT = 20;

export const REMINDER_TIMES = {
    "1 minute": minutesToSeconds(1),
    "5 minutes": minutesToSeconds(5),
    "15 minutes": minutesToSeconds(15),
    "30 minutes": minutesToSeconds(30),
    "1 hour": hoursToSeconds(1),
    "6 hours": hoursToSeconds(6),
    "12 hours": hoursToSeconds(12),
    "1 day": hoursToSeconds(24),
    "3 days": 3 * hoursToSeconds(24),
    "1 week": 7 * hoursToSeconds(24),
    "1 month": 30 * hoursToSeconds(24),
    "3 months": 90 * hoursToSeconds(24),
    "6 months": 180 * hoursToSeconds(24),
    "1 year": hoursToSeconds(HOURS_IN_YEAR)
};

export const ERRORS = {
    TOO_MANY_REMINDERS: `You can only have ${REMINDER_LIMIT} reminders at one time. You can remove them using the \`/remind delete\` command.`
};

export const formatReminderDate = (d: Date): string => format(d, "d MMMM yyyy HH:mm:ss '(UTC-5)'");
