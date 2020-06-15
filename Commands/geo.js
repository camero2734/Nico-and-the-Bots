module.exports = {
    execute: async function (msg) {
        //FIXME: Make the pitch/heading randomized
        console.log("here")
        if (geoGame && msg.author.id !== poot) return msg.delete();
        const sign = require('gme-signature');
        const cities = require("all-the-cities");
        console.log(cities.length, /CITIES/)
        const CC = await loadJsonFile("json/countrycodes.json");
        const secret = process.env.GEOSECRET;
        // let lat = Math.random() * 180 - 90;
        // let lon = Math.random() * 360 - 180;

        geoSearch();



        async function geoSearch() {
            try {
                let countries = Object.keys(CC);
                let _country = countries[Math.floor(Math.random() * countries.length)];
                let _cities = cities.filter(c => {return c.country === _country});
                let city = _cities[Math.floor(Math.random() * _cities.length)].name;
                let country = CC[_country];

                let res = await sendImage(city, country);
                if (res === "") return geoSearch();


                geoGame = true;
                let triesRemaining = 3;

                const filter = (m => {
                    if (m.author.id !== msg.author.id) return false;
                    if (filter.found) return true;
                    if (m.content.toLowerCase() === country.toLowerCase()) {
                        filter.found = true;
                        geoGame = false;
                        msg.channel.embed(`Correct! This image is from ${city}, ${country}!`);
                    }
                    else {
                        triesRemaining--;
                        if (triesRemaining === 0) {
                            msg.channel.embed(`This image is from ${city}, ${country}!`);
                            geoGame = false;
                        }
                        else if (triesRemaining > 0) msg.channel.embed(`Incorrect! You have ${triesRemaining} ${triesRemaining === 1 ? "try" : "tries"} remaining.`);
                    }

                    return true;
                });

                let msgs = await msg.channel.awaitMessages(filter, { max: 30, time: 100 * 1000, errors: ['time'] });
                console.log(msgs.size);
            } catch (err) {
                console.log(err)
            }
        }



        async function sendImage(city, country) {
            return new Promise(async resolve => {
                //PICK RANDOM VIEW
                let heading = Math.floor(Math.random() * 360);
                let pitch = Math.floor(Math.random() * 60) - 30;
                //FIND NEAREST STREETVIEW LOCATION
                let location = null;
                let distance = 1;
                while (!location && distance < 1000) {
                    let metaURL = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${city},${country}&source=outdoor&key=AIzaSyBlHrr-9TkEc3VVJz14yMGltfO1Tjs7mqY&radius=${distance}`
                    const METURL = sign(metaURL, secret);
                    let metR = await snekfetch.get(METURL);
                    if (metR.body.status === "OK") location = metR;
                    else {
                        distance*=10;
                    }
                }

                if (location) {

                    console.log(country, /COUNTRY/)
                    //GET STREETVIEW IMAGE
                    let preURL = `https://maps.googleapis.com/maps/api/streetview?size=1000x1000&source=outdoor&fov=120&heading=${heading}&pitch=${pitch}&location=${city},${country}&key=AIzaSyBlHrr-9TkEc3VVJz14yMGltfO1Tjs7mqY&radius=${distance}`

                    const REQURL = sign(preURL, secret);
                    console.log(REQURL);

                    //let img = new Discord.Attachment(r.body, "geo.png");
                    let rImg = await snekfetch.get(REQURL);
                    let embed = new Discord.RichEmbed().setColor("RANDOM").setTitle("Guess which country this is from!");
                    embed.attachFile(new Discord.Attachment(rImg.body, "geo.png"));
                    embed.setImage("attachment://geo.png");
                    await msg.channel.send(embed);
                    resolve(country);

                } else {
                    resolve("");
                }
            })

        }


    },
    info: {
        aliases: false,
        example: "!test",
        minarg: 0,
        description: "Test command",
        category: "NA",
    }
}
