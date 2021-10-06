import Rollbar from "rollbar";

export const rollbar = new Rollbar({
    accessToken: "ec97643e6fd844998535e9cc6832c024",
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment: process.env.NODE_ENV || "development",
    verbose: true
});
