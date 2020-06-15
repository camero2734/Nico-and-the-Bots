module.exports = {
    execute: function (msg) {
        if (msg.author.id !== poot) return;
        if (!msg.args[1]) return msg.channel.embed("Please visit https://www.dmascavenge.info/setlist to create your setlist entry!");
        
        msg.delete();

        let songs = [{ "title": "A Car, a Torch, a Death", "album": "Twenty One Pilots", "search": "A Car, a Torch, a Death-Twenty One Pilots" }, { "title": "Addict with a Pen", "album": "Twenty One Pilots", "search": "Addict with a Pen-Twenty One Pilots" }, { "title": "Air Catcher", "album": "Twenty One Pilots", "search": "Air Catcher-Twenty One Pilots" }, { "title": "Anathema", "album": "Regional at Best", "search": "Anathema-Regional at Best" }, { "title": "Bandito", "album": "Trench", "search": "Bandito-Trench" }, { "title": "Be Concerned", "album": "Regional at Best", "search": "Be Concerned-Regional at Best" }, { "title": "Before You Start Your Day", "album": "Twenty One Pilots", "search": "Before You Start Your Day-Twenty One Pilots" }, { "title": "Can't Help Falling in Love", "album": "Holding on to You (EP)", "search": "Can't Help Falling in Love-Holding on to You (EP)" }, { "title": "Cancer", "album": "Rock Sound Presents: The Black Parade", "search": "Cancer-Rock Sound Presents: The Black Parade" }, { "title": "Car Radio", "album": "Regional at Best", "search": "Car Radio-Regional at Best" }, { "title": "Car Radio", "album": "Vessel", "search": "Car Radio-Vessel" }, { "title": "Chlorine", "album": "Trench", "search": "Chlorine-Trench" }, { "title": "Chlorine (19.4326° N, 99.1332° W)", "album": "Location Sessions", "search": "Chlorine (19.4326° N, 99.1332° W)-Location Sessions" }, { "title": "Clear", "album": "Regional at Best", "search": "Clear-Regional at Best" }, { "title": "Cut My Lip", "album": "Trench", "search": "Cut My Lip-Trench" }, { "title": "Cut My Lip (40.6782° N, 73.9442° W)", "album": "Location Sessions", "search": "Cut My Lip (40.6782° N, 73.9442° W)-Location Sessions" }, { "title": "Doubt", "album": "Blurryface", "search": "Doubt-Blurryface" }, { "title": "Fairly Local", "album": "Blurryface", "search": "Fairly Local-Blurryface" }, { "title": "Fake You Out", "album": "Vessel", "search": "Fake You Out-Vessel" }, { "title": "Fall Away", "album": "Twenty One Pilots", "search": "Fall Away-Twenty One Pilots" }, { "title": "Forest", "album": "Regional at Best", "search": "Forest-Regional at Best" }, { "title": "Friend, Please", "album": "Twenty One Pilots", "search": "Friend, Please-Twenty One Pilots" }, { "title": "Glowing Eyes", "album": "Regional at Best", "search": "Glowing Eyes-Regional at Best" }, { "title": "Goner", "album": "YouTube", "search": "Goner-YouTube" }, { "title": "Goner", "album": "Blurryface", "search": "Goner-Blurryface" }, { "title": "Guns for Hands", "album": "Regional at Best", "search": "Guns for Hands-Regional at Best" }, { "title": "Guns for Hands", "album": "Vessel", "search": "Guns for Hands-Vessel" }, { "title": "Heathens", "album": "Suicide Squad: The Album", "search": "Heathens-Suicide Squad: The Album" }, { "title": "Heavydirtysoul", "album": "Blurryface", "search": "Heavydirtysoul-Blurryface" }, { "title": "Holding on to You", "album": "Regional at Best", "search": "Holding on to You-Regional at Best" }, { "title": "Holding on to You", "album": "Vessel", "search": "Holding on to You-Vessel" }, { "title": "Hometown", "album": "Blurryface", "search": "Hometown-Blurryface" }, { "title": "House of Gold", "album": "Regional at Best", "search": "House of Gold-Regional at Best" }, { "title": "House of Gold", "album": "Vessel", "search": "House of Gold-Vessel" }, { "title": "Implicit Demand for Proof", "album": "Twenty One Pilots", "search": "Implicit Demand for Proof-Twenty One Pilots" }, { "title": "Isle of Flightless Birds", "album": "Twenty One Pilots", "search": "Isle of Flightless Birds-Twenty One Pilots" }, { "title": "Jar of Hearts", "album": "YouTube", "search": "Jar of Hearts-YouTube" }, { "title": "Johnny Boy", "album": "Twenty One Pilots", "search": "Johnny Boy-Twenty One Pilots" }, { "title": "Jumpsuit", "album": "Trench", "search": "Jumpsuit-Trench" }, { "title": "Kitchen Sink", "album": "Regional at Best", "search": "Kitchen Sink-Regional at Best" }, { "title": "Lane Boy", "album": "Blurryface", "search": "Lane Boy-Blurryface" }, { "title": "Leave the City", "album": "Trench", "search": "Leave the City-Trench" }, { "title": "Legend", "album": "Trench", "search": "Legend-Trench" }, { "title": "Levitate", "album": "Trench", "search": "Levitate-Trench" }, { "title": "Lovely", "album": "Regional at Best", "search": "Lovely-Regional at Best" }, { "title": "Lovely", "album": "Vessel", "search": "Lovely-Vessel" }, { "title": "Mad World", "album": "YouTube", "search": "Mad World-YouTube" }, { "title": "March to the Sea", "album": "Twenty One Pilots", "search": "March to the Sea-Twenty One Pilots" }, { "title": "Message Man", "album": "Blurryface", "search": "Message Man-Blurryface" }, { "title": "Migraine", "album": "Vessel", "search": "Migraine-Vessel" }, { "title": "Morph", "album": "Trench", "search": "Morph-Trench" }, { "title": "My Blood", "album": "Trench", "search": "My Blood-Trench" }, { "title": "Neon Gravestones", "album": "Trench", "search": "Neon Gravestones-Trench" }, { "title": "Nico and the Niners", "album": "Trench", "search": "Nico and the Niners-Trench" }, { "title": "Not Today", "album": "Blurryface", "search": "Not Today-Blurryface" }, { "title": "Ode to Sleep", "album": "Regional at Best", "search": "Ode to Sleep-Regional at Best" }, { "title": "Ode to Sleep", "album": "Vessel", "search": "Ode to Sleep-Vessel" }, { "title": "Oh, Ms. Believer", "album": "Twenty One Pilots", "search": "Oh, Ms. Believer-Twenty One Pilots" }, { "title": "Pet Cheetah", "album": "Trench", "search": "Pet Cheetah-Trench" }, { "title": "Polarize", "album": "Blurryface", "search": "Polarize-Blurryface" }, { "title": "Ride", "album": "Blurryface", "search": "Ride-Blurryface" }, { "title": "Ruby", "album": "Regional at Best", "search": "Ruby-Regional at Best" }, { "title": "Save", "album": "Website", "search": "Save-Website" }, { "title": "Screen", "album": "Vessel", "search": "Screen-Vessel" }, { "title": "Semi-Automatic", "album": "Vessel", "search": "Semi-Automatic-Vessel" }, { "title": "Slowtown", "album": "Regional at Best", "search": "Slowtown-Regional at Best" }, { "title": "Smithereens", "album": "Trench", "search": "Smithereens-Trench" }, { "title": "Stressed Out", "album": "Blurryface", "search": "Stressed Out-Blurryface" }, { "title": "Taxi Cab", "album": "Twenty One Pilots", "search": "Taxi Cab-Twenty One Pilots" }, { "title": "Tear in My Heart", "album": "Blurryface", "search": "Tear in My Heart-Blurryface" }, { "title": "The Hype", "album": "Trench", "search": "The Hype-Trench" }, { "title": "The Judge", "album": "Blurryface", "search": "The Judge-Blurryface" }, { "title": "The Pantaloon", "album": "Twenty One Pilots", "search": "The Pantaloon-Twenty One Pilots" }, { "title": "The Run and Go", "album": "Vessel", "search": "The Run and Go-Vessel" }, { "title": "Time to Say Goodbye", "album": "Johnny Boy (EP)", "search": "Time to Say Goodbye-Johnny Boy (EP)" }, { "title": "Trapdoor", "album": "Twenty One Pilots", "search": "Trapdoor-Twenty One Pilots" }, { "title": "Trees", "album": "Regional at Best", "search": "Trees-Regional at Best" }, { "title": "Trees", "album": "Vessel", "search": "Trees-Vessel" }, { "title": "Truce", "album": "Vessel", "search": "Truce-Vessel" }, { "title": "Two", "album": "Regional at Best", "search": "Two-Regional at Best" }, { "title": "We Don't Believe What's on TV", "album": "Blurryface", "search": "We Don't Believe What's on TV-Blurryface" }];
        let input = msg.args[1];
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
    
        let _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".split("").reverse().join("");

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    
        while (i < input.length) {
    
            enc1 = _keyStr.indexOf(input.charAt(i++));
            enc2 = _keyStr.indexOf(input.charAt(i++));
            enc3 = _keyStr.indexOf(input.charAt(i++));
            enc4 = _keyStr.indexOf(input.charAt(i++));
    
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
    
            output = output + String.fromCharCode(chr1);
    
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
    
        }
        let arr = JSON.parse(output);
        let toSend = "";
        for (let index of arr) {
            if (!isNaN(index)) toSend += songs[index].search + "\n";
            else toSend += index + "\n";
        }
        msg.channel.embed(toSend);
    
    },
    info: {
        aliases: false,
        example: "!setlist",
        minarg: 0,
        description: "Enters you into the setlist contest!",
        category: "Music"
    }
};