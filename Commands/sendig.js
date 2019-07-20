module.exports = {
    execute: function (msg) {
        msg.delete()
        let link = msg.args[1]
        snekfetch.get(link).then((r) => {
            let dataToParseTemp = r.text
            let $ = cheerio.load(dataToParseTemp)
            let ogvideo = $("[property='og:video']")
            try {
                if (ogvideo && ogvideo['0']) ogvideo = ogvideo['0'].attribs.content
            } catch(e) {throw new Error("eat pant2")}
            
            let yes = $('body > script:nth-child(2)').html()
            yes = yes.substring(0, yes.length - 1).replace("window._sharedData = ", "")
            let jsonData = JSON.parse(yes)
            let pictures = []
            if (!jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['edge_sidecar_to_children'] || !jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['edge_sidecar_to_children']['edges']) {
                let embed = new Discord.RichEmbed({ title: `Instagram Post by ` + jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['owner']['full_name'] + ' **[' + jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['owner'].username + ']**' })
                embed.setThumbnail(jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['owner']['profile_pic_url'])
                embed.addField('\u200B', `[Post Link](${link})`)
                let edgeMedia = jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['edge_media_to_caption']
                embed.setDescription(edgeMedia.edges && edgeMedia.edges[0] && edgeMedia.edges[0].node ? jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['edge_media_to_caption'].edges[0].node.text : "No description")
                if (ogvideo && ogvideo['0']) { //If video
                    snekfetch.get(ogvideo).then(async (r) => {
                        await  msg.channel.send({embed: embed})
                         msg.channel.send(new Discord.Attachment(r.body, 'instagram.mp4'));
                    })
                } else { //Not video
                    let img = jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['display_resources'][0].src
                    embed.setImage(img)				
                     msg.channel.send({ embed: embed })
                }
                return;
            }
            let pictureData = jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['edge_sidecar_to_children']['edges']
            for (let i in pictureData) {
                //console.log(pictureData[i])
                if (pictureData[i].node.is_video) pictures.push(pictureData[i].node.video_url.split('?')[0])
                else pictures.push(pictureData[i].node.display_url.split('?')[0])
            }
            let embed = new Discord.RichEmbed({ title: `Instagram Post by ` + jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['owner']['full_name'] + ' **[' + jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['owner'].username + ']**' })
            embed.addField('\u200B', `[Post Link](${link})`)
            embed.setThumbnail(jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['owner']['profile_pic_url'])
            let edgeMedia = jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['edge_media_to_caption']
            embed.setDescription(edgeMedia.edges && edgeMedia.edges[0] && edgeMedia.edges[0].node ? jsonData['entry_data']['PostPage'][0]['graphql']['shortcode_media']['edge_media_to_caption'].edges[0].node.text : "No description")
             msg.channel.send({ embed: embed }).then(async () => {
                for (let p of pictures) {
                    await new Promise(next => {
                        let em = new Discord.RichEmbed({ title: (pictures.indexOf(p) + 1) + '/' + pictures.length })
                        if (p.endsWith('.mp4')) {
                            snekfetch.get(p).then(async (r) => {
                                await  msg.channel.send({embed: em})
                                 msg.channel.send(new Discord.Attachment(r.body, 'instagram.mp4')).then(() => next())
                            })
                        } else {
                            em.setImage(p)
                             msg.channel.send({ embed: em }).then(() => next())
                        }
                    })
                }
            })
        }).catch(e => {console.log(e)})
    }
,
    info: {
        aliases: false,
        example: "!sendig [link to post]",
        minarg: 2,
        description: "Embeds an Instagram post just like topfeed does",
        category: "Social",
    }
}