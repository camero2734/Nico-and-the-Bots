module.exports = async function(member, filter_in, time=30000, deleteAfter) {
    return new Promise(resolve => {
        let filter = (m) => {return m.author.id === member.id;};
        if (filter_in) filter = filter_in;
        this.awaitMessages(filter, { max: 1, time: time, errors: ["time"] })
            .then(async collected => {
                let m = collected.first();
                if (deleteAfter) await m.delete();
                resolve(m);
            })
            .catch(() => resolve(deleteAfter ? { content: null } : null));
    });
};