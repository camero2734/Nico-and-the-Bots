module.exports = async function() {
    return new Promise(resolve => {
        const unirest = require('unirest');
        const headers = {Authorization: 'Bot ' + this.client.token,'User-Agent': 'yehaw','Content-type': 'application/json'};
        unirest.patch(`https://discordapp.com/api/v7/channels/${this.id}`).headers(headers).send({"": ""})
        .end((r) => {
            resolve(r.body['rate_limit_per_user'])
        })
    })
}