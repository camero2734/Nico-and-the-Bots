/* eslint-disable @typescript-eslint/no-var-requires */
const { spawnSync } = require("child_process");

const files = {
    "secrets.ts": "src/Configuration/secrets.ts",
    "quiz.ts": "src/helpers/verified-quiz/quiz.ts"
};

if (process.env.RENDER) {
    console.log("[Load Secrets] Copying files...");
    for (const [from, to] of Object.entries(files)) {
        const fromPath = `/etc/secrets/${from}`;
        const toPath = `dist/${to}`;

        spawnSync("cp", [fromPath, toPath]);
    }
    console.log("[Load Secrets] Done");
}
