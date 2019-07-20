module.exports = {
    execute: function (msg) {
        try {
            let type = removeCommand(msg.content);
            let w = 5;
            let h = 5;
            if (type === "medium") w = h = 8;
            if (type === "hard") w = h = 12;
            if (type === "extreme") w = h = 14;
            let bombCount = Math.floor(0.3 * w * h); //20% of tiles?
            if (type === "misfit") w = h = 10, bombCount = 99;
            let grid = [];
            //INITIALIZE
            console.log("before initialize")
            for (let i = 0; i < w; i++) {
                grid[i] = [];
                for (let j = 0; j < h; j++) {
                    grid[i][j] = "";
                }
            }
            //PLACE BOMBS
            console.log("before placed")
            while (bombCount > 0) {
                let rani = Math.floor(Math.random() * w);
                let ranj = Math.floor(Math.random() * h);
                
                grid[rani][ranj] = "bomb";
                bombCount--;
            }
            console.log("bombs placed")
            //GET COUNTS
            for (let i = 0; i < w; i++) {
                for (let j = 0; j < w; j++) {
                    if (grid[i][j] === "bomb") continue;
                    let n1 = grid[i][j-1] //UP
                    let n2 = grid[i][j+1] //DOWN
                    let n3 = typeof grid[i+1] !== "undefined" ? grid[i+1][j] : "" //RIGHT
                    let n4 = typeof grid[i-1] !== "undefined" ? grid[i-1][j] : "" //LEFT
                    let n5 = typeof grid[i+1] !== "undefined" ? grid[i+1][j+1] : "" //C1
                    let n6 = typeof grid[i-1] !== "undefined" ? grid[i-1][j+1] : "" //C2
                    let n7 = typeof grid[i+1] !== "undefined" ? grid[i+1][j-1] : "" //C3
                    let n8 = typeof grid[i-1] !== "undefined" ? grid[i-1][j-1] : "" //C4
                    let neighbors = [n1,n2,n3,n4,n5,n6,n7,n8];
                    let count = 0;
                    neighbors.forEach(t => {if (t === "bomb") count++});
                    grid[i][j] = count;
                }
            }
    
            //CREATE MESSAGE
            let str = "";
            let nums = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"];
            for (let i = 0; i < w; i++) {
                for (let j = 0; j < w; j++) {
                    let t = grid[i][j];
                    if (!isNaN(t)) t = nums[t];
                    str+="||:" + t + ":||";
                }
                str+="\n"
            }
            //let embed = new Discord.RichEmbed().setColor("RANDOM").setDescription(str).setTitle("Minesweeper").setFooter(msg.author.id);
            msg.channel.send("Minesweeper\n" + str + "\n" + msg.author.id).then((m) => {m.react("💣")});
        } catch(e) {
            console.log(e)
        }
        

    },
    info: {
        aliases: ["minesweeper","ms"],
        example: "!minesweeper (easy, medium, hard, extreme)",
        minarg: 0,
        description: "Sends a minesweeper game",
        category: "Fun",
    }
}