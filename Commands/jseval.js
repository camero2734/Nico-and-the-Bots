module.exports = {
    execute: async function(msg){
        if (msg.author.id !== poot) return; 
        // msg.delete();
        // while (1 === 1) {
        //     await new Promise(next => {
        //         msg.channel.send("HACKED.y");
        //         setTimeout(() => { next() }, 1000);
        //     })
        // }
        
    },
    info: {
        aliases: false,
        example: "!jseval [js]",
        minarg: 0,
        description: "Does whatever",
        category: "N/A",
    }
}