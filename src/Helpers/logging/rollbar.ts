import Rollbar from "rollbar";

const onHeroku = process.env.ON_HEROKU === "1";

export const rollbar = new Rollbar({
    accessToken: "ec97643e6fd844998535e9cc6832c024",
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment: onHeroku ? "production" : "development",
    verbose: !onHeroku
});
