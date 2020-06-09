module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;
        let output = `/home/ubuntu/nico/heapdump/${Date.now()}.heapsnapshot`;
        await msg.channel.embed(`Writing heapdump to ${output}...`);
        heapdump.writeSnapshot(output);
        console.log(`Wrote heapdump to ${output}`);
        await msg.channel.embed(`Wrote heapdump to ${output}`);
    },
    info: {
        aliases: false,
        example: "!test",
        minarg: 0,
        description: "Test command",
        category: "NA"
    }
};
