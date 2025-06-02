import { format } from "date-fns";

export const REMINDER_LIMIT = 20;

export const ERRORS = {
  TOO_MANY_REMINDERS: `You can only have ${REMINDER_LIMIT} reminders at one time. You can remove them using the \`/remind delete\` command.`,
};

export const formatReminderDate = (d: Date): string => format(d, "d MMMM yyyy HH:mm:ss '(UTC-5)'");
