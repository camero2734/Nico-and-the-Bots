module.exports = async function(msg, input) {
    let content = msg.content.toLowerCase().replace(/[^a-zA-Z0-9 ]+/g, "")
    let json = await input.load(input.file);
    let words = content.split(" ");
    for (let word of words) {
        if (word.length > 15) continue;
        if (!json[word]) json[word] = 0;
        json[word]++;
    }
    await input.write(input.file, json);
}