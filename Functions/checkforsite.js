module.exports = async function(url, name, tag, guild, latest_cache) {
    const snekfetch = require("snekfetch");
    const fetch = require("node-fetch");
    const fs = require("fs");
    const cheerio = require("cheerio");
    const chans = guild.chans;
    return new Promise(async resolve => {
        try {
            let r;
            try {
                r = await fetch(url, {
                    "credentials": "include",
                    "headers": {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:76.0) Gecko/20100101 Firefox/76.0",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Upgrade-Insecure-Requests": "1",
                        "Cache-Control": "max-age=0",
                        "Cookie": "__cfduid=d1dba0ba9fdd09078e82925d2d881adf21587447420; cf_clearance=e7de5ed282ac1272cdad7e9c331498d62dea6666-1587447420-0-250; _ga=GA1.2.1350849928.1587447428; _gid=GA1.2.2061725683.1587447428"
                    }
                });

            } catch (e) {
                //Allow 403 statuses
                if (e.status === 403) r = e;
                else throw e;
            }
            let text = await r.text();
            let fileName = "./dmasite/html/" + name + Date.now() + ".html";

            //Has this site been saved before?
            if (!fs.existsSync("./dmasite/" + name + ".txt")) {
                //Write the txt file (the one that's compared to)
                await writeToFile("./dmasite/" + name + ".txt", text);
                //Write html file (for archiving purposes)
                await writeToFile(fileName, text);
                //Only initializing, no need to send an update
                return resolve(null);
            }

            //Grab the stored file
            let stored = fs.readFileSync("./dmasite/" + name + ".txt", "utf8");

            //No change!
            if (text === stored) return resolve(null);

            //But did it really change?
            if (!text || typeof text === "undefined" || text === "" || text.length < 10) {
                guild.channels.get(chans.bottest).send("<@221465443297263618> undefined glitch dmaorg " + Date.now());
                return resolve(null);
            }
            //Changed!
            if (name === "nicoandtheniners") {
                /* Deal with cache thing they added */
                let cacheMatch = text.match(/pull-2020-(\d{10})/);
                if (cacheMatch && cacheMatch.length > 1 && cacheMatch[1] !== latest_cache) {
                    latest_cache = cacheMatch[1];
                }
                text = text.replace(/pull-2020-(\d{10})/g, "pull-2020");
                if (text === stored) return resolve({latest_cache});

                console.log(text, /TEXT-WOULD-SEND/);

                return resolve({latest_cache}); //TODO: delete
            }
            if (name === "nicoJSON") return null;
            if (name === "dmaorg") {
                let newMoonCount = (r.text.match(/MOON/gi)) ? (r.text.match(/MOON/gi)).length : 0;
                let oldMoonCount = (stored.match(/MOON/gi)) ? (stored.match(/MOON/gi)).length : 0;

                //Write the txt file (the one that's compared to)
                await writeToFile("./dmasite/" + name + ".txt", text);
                //Write html file (for archiving purposes)
                await writeToFile(fileName, text);
                try {
                    let a_url = await archive(r.originalURL, { attempts: 10 });
                    guild.channels.get(chans.resourcesupdates).send("Archived current page: " + a_url + " \n\nAlso sending the HTML file as backup: ", { file: fileName });
                } catch (err) {
                    guild.channels.get(chans.resourcesupdates).send("**Unable to archive, fell back to the HTML file for changed dmaorg site. Download and open in browser.**\n*note that images will not be displayed due to how they are linked, this HTML file serves mostly as verification that something changed*", { file: fileName });
                }
                let image = "";
                if (tag) { //GET NEW IMAGE IF MAJOR DMAORG UPDATE
                    let $ = cheerio.load(r.body);
                    $("img").each((i, elem) => {
                        if (stored.indexOf(elem.attribs.src) === -1) image = "http://dmaorg.info/found/15398642_14/" + elem.attribs.src;
                    });
                }
                //Major change
                if (newMoonCount !== oldMoonCount) return resolve({ type: "MAJOR", data: image });
                //Minor change
                else return resolve({ type: "MINOR", data: image });
            } else {
                //Write the txt file (the one that's compared to)
                await writeToFile("./dmasite/" + name + ".txt", text);
                //Write html file (for archiving purposes)
                await writeToFile(fileName, text);
                try {
                    let a_url = await archive(r.originalURL, { attempts: 10 });
                } catch(err) {/*So sad!*/}
                return resolve({ type: "MINOR", data: text, latest_cache });
            }
        } catch (e) {
            let _site = (e && e.request && e.request.connection && e.request.connection._host) ? e.request.connection._host : "dmaorg";
            console.log(`${_site}: ${e.message}`, /CHECKFORSITEERROR!/);
            guild.channels.get(chans.bottest).send(`<@&554785502591451137> error in ${_site} ` + (e.message ? e.message : e.toString()));
            resolve(null);
        }
    });

    async function writeToFile(fileName, data) {
        return new Promise(async (res, rej) => {
            fs.writeFile(fileName, data, "utf8", (err) => {
                if (err) rej(err);
                else res();
            });
        });
    }
};
