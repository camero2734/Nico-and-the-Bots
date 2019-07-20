module.exports = async function() {
    let keys = chans.keys;
    let found = false;
    for (let key of keys) {
        console.log(key);
        await new Promise(next => {
            let currentKey = nsfai.app._config.apiKey;
            if (!found) {
                nsfai = new NSFAI(key);
                nsfai.predict("https://thebalancedplate.files.wordpress.com/2008/05/bagel-group.jpg").then(() => {
                    found = true;
                    next()
                }).catch(e => {
                    console.log(e.data);
                    next()
                });
            } else next();
        })
    }
    if (!found) bot.guilds.get("269657133673349120").channels.get("470406597860917249").send("<@221465443297263618> All NSFW keys have run out.");
    console.log(chalk.blueBright("Key chosen: " + nsfai.app._config.apiKey));
}