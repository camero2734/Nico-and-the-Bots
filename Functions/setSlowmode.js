module.exports = async function(time) {
    return new Promise(resolve => {
        const unirest = require('unirest');
        const headers = {Authorization: 'Bot ' + this.client.token,'User-Agent': 'yehaw','Content-type': 'application/json'};
        unirest.patch(`https://discordapp.com/api/v7/channels/${this.id}`).headers(headers).send({"rate_limit_per_user": time})
        .end((r) => {
            resolve(r.body)
        })
    })
}