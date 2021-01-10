import { categoryIDs, channelIDs, roles } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { ChannelLogsQueryOptions, Message, MessageAttachment, Snowflake, TextChannel } from "discord.js";
import fetch from "node-fetch";

export default new Command({
    name: "endjail",
    description: "Removes a user for jail and restores their permissions",
    category: "Staff",
    usage: "!endjail {IN JAIL CHANNEL}",
    example: "!endjail",
    async cmd(msg: CommandMessage): Promise<void> {
        if (!msg.channel.name.endsWith("chilltown") || msg.channel.parentID !== categoryIDs.chilltown) {
            throw new CommandError(`This is not a jail channel. You almost deleted ${msg.channel}. Think about your actions, ${msg.author}.`); // prettier-ignore
        } else {
            await msg.channel.embed("Creating channel archive file, please wait...");
            const allMessages = await fetchAllMessages(msg.channel, 2000);

            let html =
                "<head>\n  <style>\n    body {background-color: #36393f}\n  	.avatar {border-radius: 100%; }\n    .timestamp {font-size: 10px; color: #777777}\n    .textcontent {font-size: 12px; color: white}\n    .username {color: white; font-size: 30px}\n  </style>\n</head>";

            for (const m of allMessages) {
                if (m.content || m.attachments) {
                    let registered = false;
                    let mhtml = "<div>\n";

                    const displayName = m.member?.displayName || m.author.id + " (left server)";

                    mhtml += `<img class="avatar" src="${m.author.displayAvatarURL()}" align="left" height=40/><span class="username"><b>${displayName}</b></span>  <span class="timestamp">(${
                        m.author.id
                    })</span>\n`;
                    mhtml += `<p display="inline" class="timestamp"> ${m.createdAt
                        .toString()
                        .replace("Central Standard Time", m.createdTimestamp.toString())} </p>\n`;
                    if (m.content) {
                        mhtml += `<p class="textcontent">${fixEmojis(m.content)}</p>`;
                        registered = true;
                    }
                    if (m.attachments) {
                        const attachments = m.attachments.array();
                        for (const a of attachments) {
                            if (a.name?.endsWith("png") || a.name?.endsWith("gif") || a.name?.endsWith("jpg")) {
                                const _file = await fetch(a.url).then((res) => res.buffer());
                                const base64 = _file.toString("base64");
                                console.log(base64.substring(0, 100), "base64");
                                html += `\n<img src="data:image/jpeg;base64,${base64}"><br><br>`;
                                registered = true;
                            }
                        }
                    }
                    if (registered) html += mhtml + "\n</div><br>\n";
                }
            }
            console.log("creating attachment");
            const attachment = new MessageAttachment(Buffer.from(html), `${msg.channel.name}.html`);

            // TODO: DM users chat log
            const permissions = msg.channel.permissionOverwrites.array();
            const members = [];
            for (const p of permissions) {
                if (p.type === "member") {
                    members.push(p.id);
                }
            }

            //Log file
            const jailLogChan = msg.guild.channels.cache.get(channelIDs.jaillog) as TextChannel;
            if (!jailLogChan) throw new Error();
            await jailLogChan.embed("Jail ended: " + members.map((_m) => `<@${_m}>`));
            await jailLogChan.send(attachment);

            //DM users
            for (const memid of members) {
                try {
                    const mem = await msg.guild.members.fetch(memid);
                    const dm = await mem.createDM();
                    await dm.embed("This is an archive of the jail chat. It is recommended you keep this for future reference.\n\nDownload it and open it with a browser."); // prettier-ignore
                    await dm.send(attachment);
                } catch (e) {
                    await jailLogChan.embed(`Unable to DM user with id ${memid} to send jail archive.`); // prettier-ignore
                }
            }

            await msg.channel.embed("This channel will be deleted. If this was a mistake, change the channel name to `NO`. You have 30 seconds."); // prettier-ignore

            await new Promise((next) => setTimeout(next, 30 * 1000));

            if (msg.channel.name.toLowerCase() !== "no") {
                await msg.channel.embed("Removing users' jail status...");
                await new Promise((next) => setTimeout(next, 3 * 1000));
                for (const memid of members) {
                    const mem = await msg.guild.members.fetch(memid);
                    if (mem.roles.cache.get(roles.jailedDE)) {
                        await mem.roles.add(roles.deatheaters); // Add DE
                        await mem.roles.remove(roles.jailedDE); // Remove Jail DE
                    }
                    await mem.roles.remove(roles.muted);
                    await mem.roles.remove(roles.hideallchannels); // Remove hideallchannels
                }
                await msg.channel.embed("Removal completed. Deleting channel...");
                await new Promise((next) => setTimeout(next, 5 * 1000));
                await msg.channel.delete();
            } else {
                await msg.channel.embed("You have chosen not to delete this channel. All users are still in jail.");
                await msg.channel.setName(
                    `${members
                        .map((m) => msg.guild.members.cache.get(m)?.displayName.replace(/[^A-z0-9]/g, ""))
                        .join("-")}-chilltown`
                );
            }
        }
    }
});

function fixEmojis(text: string): string {
    const regCapture = /<(a{0,1}):\w+:(\d{18})>/;
    while (regCapture.test(text)) {
        const results = regCapture.exec(text);
        if (!results) break;

        const ending = results[1] && results[1] === "a" ? "gif" : "png";
        const id = results[2];
        const newText = `<img src="https://cdn.discordapp.com/emojis/${id}.${ending}" height=20>`;
        text = text.replace(regCapture, newText);
    }
    return text;
}

async function fetchAllMessages(channel: TextChannel, limit = 500): Promise<Message[]> {
    const messages: Record<Snowflake, Message> = {};
    let lastMessage = null;

    fetcher: while (Object.keys(messages).length < limit) {
        const options: ChannelLogsQueryOptions = { limit: 100, before: lastMessage || undefined };

        console.log("Fetching...");
        const msgs = (await channel.messages.fetch(options)).array();
        if (!msgs || !msgs[msgs.length - 1] || msgs[msgs.length - 1].id === lastMessage) break fetcher;
        for (const m of msgs) {
            messages[m.id] = m;
        }
        lastMessage = msgs[msgs.length - 1].id;
        await new Promise((next) => setTimeout(next, 5000));
    }
    const finalArray: Message[] = [];
    for (const id in messages) {
        finalArray.push(messages[id]);
    }
    return finalArray.reverse();
}
