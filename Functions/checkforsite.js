module.exports = async function(url, name, tag, guild) {
    const snekfetch = require("snekfetch");
    const fs = require("fs");
    const cheerio = require("cheerio");
    const chans = guild.chans;
    return new Promise(async resolve => {
        try {
            let r;
            try {
                r = await snekfetch.get(url);
            } catch (e) {
                //Allow 403 statuses
                if (e.status === 403) r = e;
                else throw e;
            }
            let text = r.text && r.text.toString();
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
                return resolve({ type: "MINOR", data: text });
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