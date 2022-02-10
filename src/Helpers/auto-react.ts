import { channelIDs } from "../Configuration/config";
import { Channel, EmojiIdentifierResolvable, Message, Snowflake } from "discord.js";
import Mime from "mime-types";

interface BaseReactType {
    reactTo: string;
    reactWith: EmojiIdentifierResolvable[];
    appliesTo: (msg: Message) => boolean;
}

class FileReact implements BaseReactType {
    reactTo: "File";
    constructor(
        public reactWith: EmojiIdentifierResolvable[],
        public typeCheck: (extension: string, mime: string) => boolean,
        public checkRawURLs = false
    ) {}
    public static MimeCheck(mimes: string[]) {
        return (extension: string, mime: string): boolean => {
            return mimes.some((uMime) => mime.startsWith(uMime.toLowerCase()));
        };
    }
    public static ExtensionCheck(extensions: string[]) {
        return (extension: string, mime: string): boolean => {
            return extensions.some((ext) => ext === extension);
        };
    }

    appliesTo(msg: Message): boolean {
        const files: { url?: string | undefined }[] = [...msg.attachments.values()];
        if (this.checkRawURLs) files.push(...msg.embeds); // If a url is used, then it gets embedded (usually)
        return files.some((f) => f.url && this.checkFile(f.url));
    }

    checkFile(url: string): boolean {
        const mime = Mime.lookup(url);
        if (!mime) return false;

        const extension = Mime.extension(mime);
        if (!extension) return false;

        return this.typeCheck(extension, mime);
    }
}

class MessageReact implements BaseReactType {
    reactTo: "Message";
    constructor(public reactWith: EmojiIdentifierResolvable[], public roles: Snowflake[] = []) {}
    appliesTo(msg: Message): boolean {
        if (this.roles.length === 0) return true;
        return this.roles.some((r) => msg.member?.roles.cache.has(r));
    }
}

type AnyReact = FileReact | MessageReact;

class ChannelReactions {
    reacts: AnyReact[] = [];
    constructor(public channel: Snowflake) {}
    addReactions(reacts: AnyReact[]): this {
        this.reacts.push(...reacts);
        return this;
    }
}

const channelReacts = [
    new ChannelReactions(channelIDs.creations).addReactions([
        new FileReact(["💙"], FileReact.MimeCheck(["image", "video"]), true)
    ]),
    new ChannelReactions(channelIDs.musiccreations).addReactions([
        new FileReact(["💙"], FileReact.MimeCheck(["audio", "video"]), true)
    ]),
    new ChannelReactions(channelIDs.memes).addReactions([
        new FileReact(["👍", "👎"], FileReact.MimeCheck(["audio", "video", "image"]), true)
    ]),
    new ChannelReactions(channelIDs.cliqueartfriday).addReactions([
        new FileReact(["💝"], FileReact.MimeCheck(["audio", "video", "image"]), true)
    ])
];

async function onMessage(msg: Message): Promise<void> {
    // Find ChannelReactions object for this channel
    const channelReact = channelReacts.find((cr) => cr.channel === msg.channel.id);
    if (!channelReact) return;

    // Find reaction that applies to this message
    const react = channelReact.reacts.find((r) => r.appliesTo(msg));
    if (!react) return;

    // React to message
    for (const reactionEmoji of react.reactWith) await msg.react(reactionEmoji);
}

export default onMessage;
