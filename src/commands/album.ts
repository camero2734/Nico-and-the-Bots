import { roles } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { MessageTools } from "helpers";

export default new Command({
    name: "album",
    description: "Assigns the role corresponding to one of the band's albums",
    category: "Roles",
    usage: "!album [Album name]",
    example: "!album RAB",
    async cmd(msg: CommandMessage): Promise<void> {
        const albumRoles = Object.values(roles.albums);
        const askingFor = msg.argsString;

        if (!askingFor) throw new CommandError("You didn't input an album name");

        let give = ""; //role that will be given
        switch (askingFor.substring(0, 4)) {
            case "tren":
                give = roles.albums.TRENCH;
                break;
            case "blur":
            case "bf":
                give = roles.albums.BF;
                break;
            case "vess":
            case "vsl":
                give = roles.albums.VSL;
                break;
            case "regi":
            case "rab":
                give = roles.albums.RAB;
                break;
            case "st":
            case "self":
            case "s/t":
                give = roles.albums.ST;
                break;
            case "no p":
            case "npi":
                give = roles.albums.NPI;
                break;
            default:
                throw new CommandError(`I couldn't find the album corresponding to ${askingFor}`);
        }

        await msg.member?.fetch();

        for (const role of albumRoles) {
            if (msg.member?.roles.cache.has(role)) await msg.member.roles.remove(role);
        }

        await msg.member?.roles.add(give);

        const role = await msg.guild?.roles.fetch(give);

        await msg.channel.send(MessageTools.textEmbed(`You now have the ${role?.name} role!`, role?.hexColor));
    }
});
