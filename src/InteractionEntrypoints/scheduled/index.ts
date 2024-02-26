import Cron from "croner";
import { songBattleCron } from "./songbattle";

Cron("0 17 * * *", { timezone: "Europe/Amsterdam" }, songBattleCron);
