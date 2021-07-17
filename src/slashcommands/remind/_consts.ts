import { format, hoursToMilliseconds, minutesToMilliseconds } from "date-fns";
const HOURS_IN_YEAR = 24 * 365;

export const REMINDER_LIMIT = 20;

export const REMINDER_TIMES = {
    "1 minute": minutesToMilliseconds(1),
    "5 minutes": minutesToMilliseconds(5),
    "15 minutes": minutesToMilliseconds(15),
    "30 minutes": minutesToMilliseconds(30),
    "1 hour": hoursToMilliseconds(1),
    "6 hours": hoursToMilliseconds(6),
    "12 hours": hoursToMilliseconds(12),
    "1 day": hoursToMilliseconds(24),
    "3 days": 3 * hoursToMilliseconds(24),
    "1 week": 7 * hoursToMilliseconds(24),
    "1 month": 30 * hoursToMilliseconds(24),
    "3 months": 90 * hoursToMilliseconds(24),
    "6 months": 180 * hoursToMilliseconds(24),
    "1 year": hoursToMilliseconds(HOURS_IN_YEAR)
};

export const ERRORS = {
    TOO_MANY_REMINDERS: `You can only have ${REMINDER_LIMIT} reminders at one time. You can remove them using the \`/remind delete\` command.`
};

export const formatReminderDate = (d: Date): string => format(d, "d MMMM yyyy HH:mm:ss '(UTC-5)'");
