module.exports = async function() {
    return new Promise(async resolve => {
        let values = await this.keys(); 
        let entries = [];
        for (name of values) { if (!name.startsWith("_")) entries.push(name) }
        resolve(entries)
    })
}