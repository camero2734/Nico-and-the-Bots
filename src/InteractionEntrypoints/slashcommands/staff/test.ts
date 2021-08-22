import consola from "consola";
import { imageHash } from "image-hash";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: [
        {
            name: "user",
            description: "User",
            required: false,
            type: "USER"
        }
    ]
});

async function getHash(src: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        imageHash(src, 64, true, (error: Error, data: string) => {
            if (error) reject(error);
            else resolve(data);
        });
    });
}

command.setHandler(async (ctx) => {
    const hash1 = await getHash("https://i.imgur.com/GVHnqPe.png");
    const hash2 = await getHash("https://i.imgur.com/M7rh5JO.png");

    consola.warn(hash1);
    consola.warn(hash2);

    const h1 = Buffer.from(hash1, "hex");
    const h2 = Buffer.from(hash2, "hex");

    await ctx.send({ content: `${F.hammingDist(h1, h2)}` });
});

export default command;
