module.exports = {
    apps: [
        {
            name: "nico",
            script: "yarn",
            args: "start",
            interpreter: 'none'
        },
        {
            name: "nico-dev",
            script: "yarn",
            args: "dev",
            interpreter: 'none'
        }
    ]
}