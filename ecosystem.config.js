module.exports = {
    apps: [
        {
            name: "nico",
            script: "bun",
            args: "run start",
            interpreter: 'none'
        },
        {
            name: "nico-dev",
            script: "bun",
            args: "run dev",
            interpreter: 'none'
        }
    ]
}
