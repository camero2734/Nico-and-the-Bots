module.exports = {
    execute: async function (msg) {
        ["534890883016032257", "534890899323224064", "534890910526472202", "534890903664328714", "538224831779307534", "534890933301542912", "535588989713907713", "534890931573358623", "534890940343779328", "595478773487501376"];
        let divider = "534949349818499082";
        //[tyler, josh, dmaorg, jenna, jim, other, band, interviews]
        let roleArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let roles = {
            "Tyler posts": "534890883016032257",
            "Josh posts": "534890899323224064",
            "the band account posts": "534890910526472202",
            "dmaorg or any related site updates": "534890903664328714",
            "a YouTube video is uploaded": "538224831779307534",
            "Jenna posts": "534890933301542912",
            "Debby posts": "535588989713907713",
            "Jim posts": "534890931573358623",
            "any other account posts": "534890940343779328",
            "an interview is posted": "595478773487501376"
        };

        let dm = await msg.member.createDM();
        msg.channel.embed("Please respond to the questions sent to your DM!");
        let arr = Object.keys(roles);
        for (let i = 0; i < arr.length; i++) {
            dm.embed("Would you like to be notified when " + arr[i] + "?");
            let response = await dm.awaitMessage(msg.member, m => {return ((m.content.toLowerCase().indexOf("yes") !== -1 || m.content.toLowerCase().indexOf("no") !== -1) && m.author.id === msg.author.id);});
            if (response.content.toLowerCase().indexOf("yes") !== -1) roleArr[i] = 1;

        }
        console.log("after");
        //REMOVE OLD ROLES FIRST
        let roleMap = roleArr.join("");
        try {
            await msg.member.removeRole(divider);
        } catch (err) {
            console.log(err);
        }
        console.log("afterafter");
        for (let i = 0; i < arr.length; i++) {
            try {
                if (roleMap.charAt(i) === "0" && msg.member.roles.get(roles[arr[i]])) {
                    console.log(i, true);
                    await msg.member.removeRole(roles[arr[i]]);
                } else console.log(i, roleMap.charAt(i), arr[i]);
            } catch (err) {
                console.log(err, /ERRRR/);
            }
        }

        //ADD ROLES
        for (let i = 0; i < arr.length; i++) {
            if (roleMap.charAt(i) === "1" && !msg.member.roles.get(roles[arr[i]])) await msg.member.addRole(roles[arr[i]]);
        }
        if (roleMap.indexOf("1") !== -1) await msg.member.addRole(divider);

        let hasRoles = "";
        for (let key in roles) {
            if (msg.member.roles.get(roles[key])) {
                hasRoles += `<@&${roles[key]}> `;
            }
        }
        dm.embed("Your roles have been set. For a list of what roles you got, check the channel you used the command in!");
        msg.channel.embed(msg.member + ", you now have the following roles:\n\n" + hasRoles);
    }
    ,
    info: {
        aliases: false,
        example: "!topfeed",
        minarg: 0,
        description: "Turns on pings for #topfeed",
        category: "Roles"
    }
};