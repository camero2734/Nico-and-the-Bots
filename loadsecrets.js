/* eslint-disable @typescript-eslint/no-var-requires */
const { spawnSync } = require("child_process");

const files = {
    "secrets.ts": "src/configuration/secrets.ts",
    "quiz.ts": "src/helpers/verified-quiz/quiz.ts"
};

if (process.env.RENDER) {
    for (const [from, to] of Object.entries(files)) {
        const fromPath = `/etc/secrets/${from}`;
        const toPath = `dist/${to}`;

        spawnSync("cp", [fromPath, toPath]);
    }
}
