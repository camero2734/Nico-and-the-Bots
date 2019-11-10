module.exports = async function (guild, Discord) {
    const ontime = require("ontime");
    const snekfetch = require("snekfetch");
    const loadJsonFile = require("load-json-file");
    const chans = await loadJsonFile("channels.json");
    let getCountryCode = function (name) {
        let codes = { "BD": "Bangladesh", "BE": "Belgium", "BF": "Burkina Faso", "BG": "Bulgaria", "BA": "Bosnia and Herzegovina", "BB": "Barbados", "WF": "Wallis and Futuna", "BL": "Saint Barthelemy", "BM": "Bermuda", "BN": "Brunei", "BO": "Bolivia", "BH": "Bahrain", "BI": "Burundi", "BJ": "Benin", "BT": "Bhutan", "JM": "Jamaica", "BV": "Bouvet Island", "BW": "Botswana", "WS": "Samoa", "BQ": "Bonaire, Saint Eustatius and Saba ", "BR": "Brazil", "BS": "Bahamas", "JE": "Jersey", "BY": "Belarus", "BZ": "Belize", "RU": "Russia", "RW": "Rwanda", "RS": "Serbia", "TL": "East Timor", "RE": "Reunion", "TM": "Turkmenistan", "TJ": "Tajikistan", "RO": "Romania", "TK": "Tokelau", "GW": "Guinea-Bissau", "GU": "Guam", "GT": "Guatemala", "GS": "South Georgia and the South Sandwich Islands", "GR": "Greece", "GQ": "Equatorial Guinea", "GP": "Guadeloupe", "JP": "Japan", "GY": "Guyana", "GG": "Guernsey", "GF": "French Guiana", "GE": "Georgia", "GD": "Grenada", "GB": "United Kingdom", "GA": "Gabon", "SV": "El Salvador", "GN": "Guinea", "GM": "Gambia", "GL": "Greenland", "GI": "Gibraltar", "GH": "Ghana", "OM": "Oman", "TN": "Tunisia", "JO": "Jordan", "HR": "Croatia", "HT": "Haiti", "HU": "Hungary", "HK": "Hong Kong", "HN": "Honduras", "HM": "Heard Island and McDonald Islands", "VE": "Venezuela", "PR": "Puerto Rico", "PS": "Palestinian Territory", "PW": "Palau", "PT": "Portugal", "SJ": "Svalbard and Jan Mayen", "PY": "Paraguay", "IQ": "Iraq", "PA": "Panama", "PF": "French Polynesia", "PG": "Papua New Guinea", "PE": "Peru", "PK": "Pakistan", "PH": "Philippines", "PN": "Pitcairn", "PL": "Poland", "PM": "Saint Pierre and Miquelon", "ZM": "Zambia", "EH": "Western Sahara", "EE": "Estonia", "EG": "Egypt", "ZA": "South Africa", "EC": "Ecuador", "IT": "Italy", "VN": "Vietnam", "SB": "Solomon Islands", "ET": "Ethiopia", "SO": "Somalia", "ZW": "Zimbabwe", "SA": "Saudi Arabia", "ES": "Spain", "ER": "Eritrea", "ME": "Montenegro", "MD": "Moldova", "MG": "Madagascar", "MF": "Saint Martin", "MA": "Morocco", "MC": "Monaco", "UZ": "Uzbekistan", "MM": "Myanmar", "ML": "Mali", "MO": "Macao", "MN": "Mongolia", "MH": "Marshall Islands", "MK": "Macedonia", "MU": "Mauritius", "MT": "Malta", "MW": "Malawi", "MV": "Maldives", "MQ": "Martinique", "MP": "Northern Mariana Islands", "MS": "Montserrat", "MR": "Mauritania", "IM": "Isle of Man", "UG": "Uganda", "TZ": "Tanzania", "MY": "Malaysia", "MX": "Mexico", "IL": "Israel", "FR": "France", "IO": "British Indian Ocean Territory", "SH": "Saint Helena", "FI": "Finland", "FJ": "Fiji", "FK": "Falkland Islands", "FM": "Micronesia", "FO": "Faroe Islands", "NI": "Nicaragua", "NL": "Netherlands", "NO": "Norway", "NA": "Namibia", "VU": "Vanuatu", "NC": "New Caledonia", "NE": "Niger", "NF": "Norfolk Island", "NG": "Nigeria", "NZ": "New Zealand", "NP": "Nepal", "NR": "Nauru", "NU": "Niue", "CK": "Cook Islands", "XK": "Kosovo", "CI": "Ivory Coast", "CH": "Switzerland", "CO": "Colombia", "CN": "China", "CM": "Cameroon", "CL": "Chile", "CC": "Cocos Islands", "CA": "Canada", "CG": "Republic of the Congo", "CF": "Central African Republic", "CD": "Democratic Republic of the Congo", "CZ": "Czech Republic", "CY": "Cyprus", "CX": "Christmas Island", "CR": "Costa Rica", "CW": "Curacao", "CV": "Cape Verde", "CU": "Cuba", "SZ": "Swaziland", "SY": "Syria", "SX": "Sint Maarten", "KG": "Kyrgyzstan", "KE": "Kenya", "SS": "South Sudan", "SR": "Suriname", "KI": "Kiribati", "KH": "Cambodia", "KN": "Saint Kitts and Nevis", "KM": "Comoros", "ST": "Sao Tome and Principe", "SK": "Slovakia", "KR": "South Korea", "SI": "Slovenia", "KP": "North Korea", "KW": "Kuwait", "SN": "Senegal", "SM": "San Marino", "SL": "Sierra Leone", "SC": "Seychelles", "KZ": "Kazakhstan", "KY": "Cayman Islands", "SG": "Singapore", "SE": "Sweden", "SD": "Sudan", "DO": "Dominican Republic", "DM": "Dominica", "DJ": "Djibouti", "DK": "Denmark", "VG": "British Virgin Islands", "DE": "Germany", "YE": "Yemen", "DZ": "Algeria", "US": "United States", "UY": "Uruguay", "YT": "Mayotte", "UM": "United States Minor Outlying Islands", "LB": "Lebanon", "LC": "Saint Lucia", "LA": "Laos", "TV": "Tuvalu", "TW": "Taiwan", "TT": "Trinidad and Tobago", "TR": "Turkey", "LK": "Sri Lanka", "LI": "Liechtenstein", "LV": "Latvia", "TO": "Tonga", "LT": "Lithuania", "LU": "Luxembourg", "LR": "Liberia", "LS": "Lesotho", "TH": "Thailand", "TF": "French Southern Territories", "TG": "Togo", "TD": "Chad", "TC": "Turks and Caicos Islands", "LY": "Libya", "VA": "Vatican", "VC": "Saint Vincent and the Grenadines", "AE": "United Arab Emirates", "AD": "Andorra", "AG": "Antigua and Barbuda", "AF": "Afghanistan", "AI": "Anguilla", "VI": "U.S. Virgin Islands", "IS": "Iceland", "IR": "Iran", "AM": "Armenia", "AL": "Albania", "AO": "Angola", "AQ": "Antarctica", "AS": "American Samoa", "AR": "Argentina", "AU": "Australia", "AT": "Austria", "AW": "Aruba", "IN": "India", "AX": "Aland Islands", "AZ": "Azerbaijan", "IE": "Ireland", "ID": "Indonesia", "UA": "Ukraine", "QA": "Qatar", "MZ": "Mozambique" };
        for (let key in codes) {
            if (codes[key].toLowerCase() === name.toLowerCase()) return key;
        }
        return name.substring(0, 2);
    };

    guild.client.on("message", async (msg) => {
        if (msg.content === "!updateconcertchannels" && msg.author.id === "221465443297263618") {
            await updateChans();
            await msg.channel.embed("Done.");
        }
        else if (msg.content === "!deleteconcertchannels" && msg.author.id === "221465443297263618") {
            await deleteChannels();
            await msg.channel.embed("Done.");
        }
    });

    ontime({
        cycle: ["12:00:00"]
    }, function (ot) {
        console.log("Updating concert channels...");
        updateChans();
        ot.done();
        return;
    });

    async function deleteChannels() {
        let currentRoles = [];
        let allRoles = guild.roles.array();

        for (let r of allRoles) {
            r.hexColor = r.hexColor.toLowerCase();
            if ((r.hexColor === "#3a74a2" || r.hexColor === "#4a74a2") && guild.channels.some(c => c.name.toLowerCase() === r.name.replace(/ /g, "-").toLowerCase())) {
                currentRoles.push(r);
            }
        }

        for (let r of currentRoles) {
            let chan = guild.channels.find(c => c.name.toLowerCase() === r.name.replace(/ /g, "-").toLowerCase());
            if (chan.parentID === chans.tourcategory) {
                await r.delete();
                await chan.delete();
                await guild.channels.get(chans.bottest).embed(r.name + " has been deleted.");
            }
        }
    }

    async function updateChans() {
        let apiURL = "https://api.songkick.com/api/3.0/artists/3123851/calendar.json?apikey=heMLjOnXj1zuWDXP";
        let r = await snekfetch.get(apiURL);
        let init_json = r.body.resultsPage.results.event;
        let json = [];
        let previousDate = null;
        let previousCity = null;
        let previousSeries = null;
        for (let concert of init_json) if (concert && concert.venue && concert.venue.displayName && (concert.start.date !== previousDate) || (concert.location.city !== previousCity && (!concert.series || (concert.series.displayName.indexOf(previousSeries) === -1 && previousSeries.indexOf(concert.series.displayName) === -1)))) {
            if (concert.venue.displayName === "Unknown venue" && concert.series) {
                concert.venue.displayName = concert.series.displayName;
            }
            json.push(concert);
            previousDate = concert.start.date;
            previousCity = concert.location.city;
            previousSeries = concert.series ? concert.series.displayName : previousSeries;
        }

        let existsChans = [];

        for (let i = 0; i < json.length; i++) {
            let concert = json[i];
            //CREATE CHANNEL NAME
            let name = `${concert.location.city.split(",")[0]}-${getCountryCode(concert.location.city.split(",")[1].trim())}`.replace(/ /g, "-").replace(/-{2,}/g, "-");
            console.log(name, /NAME/);
            //SEE IF CHANNEL EXISTS
            let alreadyExists = guild.channels.find(ch => { return ch.name.toLowerCase() === name.toLowerCase(); });
            let num = guild.channels.get(chans.tourcategory).children.array().length;
            //IF IT DOESN'T, ADD THE CHANNEL ONLY IF THERE AREN'T ALREADY 45 CHANNELS
            if (!alreadyExists && num < 50) {
                let role = await guild.createRole({ name: name.replace(/-/g, " ") });
                await role.setColor("#3a74a2");
                let position = guild.roles.get("534949349818499082").calculatedPosition;
                console.log(position);
                let successful = true;
                try {
                    await role.setPosition(position + 1);
                } catch (e) {
                    try {
                        await role.setPosition(position + 1);
                    } catch (e2) {
                        console.log(e2);
                        successful = false;
                    }
                }


                let chan = await guild.createChannel(name, {
                    type: "text",
                    permissionOverwrites: [
                        {
                            id: "275114879248236544", //BOT
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        }, {
                            id: guild.id, //EVERYONE
                            deny: ["VIEW_CHANNEL"]
                        }, {
                            id: role.id, //CREATED ROLE
                            allow: ["VIEW_CHANNEL"]
                        }, {
                            id: "278225702455738368", //MUTED
                            deny: ["SEND_MESSAGES", "READ_MESSAGE_HISTORY"]
                        }, {
                            id: "330877657132564480", //STAFF
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        }]
                });

                await chan.setParent(chans.tourcategory);

                //MAKE ANNOUNCEMENT
                let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                let startDate = new Date(concert.start.date + " 00:00:00");
                let endDate = concert.end ? new Date(concert.end.date + " 00:00:00") : undefined;

                let field = `${months[startDate.getMonth()]} ${startDate.getDate()}`;
                if (endDate) field += `-${months[endDate.getMonth()]} ${endDate.getDate()}`;
                let embed = new Discord.RichEmbed().setColor("RANDOM").setTitle("#" + name + " added!").addField("Date", field, true).addField("Venue", concert.venue.displayName);
                if (!successful) embed.setFooter("ERR 01"); //COULDNT MOVE ROLE
                await guild.channels.get(chans.announcements).send(embed);
            }
            existsChans.push(name.toLowerCase());
        }
        //CHECK IF CHANNELS EXIST THAT AREN'T IN JSON (PAST CONCERTS), CHANGE ROLE COLOR TO #4a74a2
        let currentRoles = [];
        let allRoles = guild.roles.array();

        for (let r of allRoles) {
            r.hexColor = r.hexColor.toLowerCase();
            if ((r.hexColor === "#3a74a2" || r.hexColor === "#4a74a2") && guild.channels.some(c => c.name.toLowerCase() === r.name.replace(/ /g, "-").toLowerCase())) {
                currentRoles.push(r);
            }
        }

        console.log(existsChans);
        for (let r of currentRoles) {
            r.hexColor = r.hexColor.toLowerCase();
            if (r.hexColor === "#3a74a2" && existsChans.indexOf(r.name.replace(/ /g, "-").toLowerCase()) === -1) { // CONCERT IS OVER
                await r.setColor("#4a74a2");
                let chan = guild.channels.find(c => c.name.toLowerCase() === r.name.replace(/ /g, "-").toLowerCase());
                await chan.embed("This channel will automatically be deleted in 24 hours. Please make sure to save/screenshot anything you want to keep!");
                await guild.channels.get(chans.bottest).embed(r.name + " will be deleted in 24 hours.");
                continue;
            } else if (r.hexColor === "#4a74a2") { //CHECK IF ROLE HAS #4a74a2, DELETE
                console.log(r.name + " deleting");
                let chan = guild.channels.find(c => c.name.toLowerCase() === r.name.replace(/ /g, "-").toLowerCase());
                if (chan.parentID === chans.tourcategory) {
                    await r.delete();
                    await chan.delete();
                    await guild.channels.get(chans.bottest).embed(r.name + " has been deleted.");
                }
            }
        }

    }

};