import { createCanvas, loadImage, registerFont } from "canvas";
import { Command, CommandMessage } from "configuration/definitions";
import { Economy } from "database/entities/Economy";
import { MessageAttachment } from "discord.js";
import { Connection } from "typeorm";

export default new Command({
    name: "top",
    description: "Displays a leaderboard highlighting who has earned the most points *this month*",
    category: "Info",
    usage: "!top (page #)",
    example: "!top 5",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        // Canvas Initialization
        const canvas = createCanvas(500, 600);
        const ctx = canvas.getContext("2d");

        // LOAD FONTS
        const fonts = ["h", "f", "NotoEmoji-Regular", "a", "j", "c", "br"];
        for (const font of fonts) registerFont(`./src/assets/fonts/${font}.ttf`, { family: "futura" });

        // Background image
        const img = await loadImage("./src/assets/albums/leaderboardNew.png");
        ctx.drawImage(img, 0, 0);

        // Border
        const startY = 65;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.strokeRect(20, startY - 5, 460, startY - 5 + 475);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(20, startY - 5, 460, startY - 5 + 475);

        //Get the page number and bounds
        const inPage = msg.args[0];
        const page = !isNaN(Number(inPage)) ? parseInt(inPage) : 1;

        //Some initialization
        const economies = await connection
            .getRepository(Economy)
            .createQueryBuilder("e")
            .orderBy("e.monthlyScore", "DESC")
            .limit(10)
            .offset(10 * page - 10)
            .getMany();

        let rownum = 10 * page - 9;
        for (const ec of economies) {
            const member = await msg.guild?.members.fetch(ec.id).catch(() => null);
            const uName = member?.displayName || "Invalid User";

            const diff = 1.15 * ((rownum - 1) % 10);

            //Header
            ctx.fillStyle = "#fce300";
            ctx.textAlign = "center";
            ctx.font = "48px futura";
            ctx.fillText("Leaderboard", 250, 50);

            //Avatar
            if (member) {
                let avatarURL = member.user.avatarURL({ format: "png", size: 32 });
                if (!avatarURL) {
                    avatarURL = `https://ui-avatars.com/api/?background=random&name=${member.displayName}`;
                }

                const pfp = await loadImage(avatarURL);
                ctx.drawImage(pfp, 80, startY - 1 + 46.3 * diff, 42, 42);
            }

            //STYLE ME!!
            ctx.textAlign = "end";
            ctx.font = "25px futura";
            ctx.fillStyle = "white";

            //Row num
            ctx.fillText(rownum.toString(), 65, startY + 30 + 46.1 * diff);

            //Username
            ctx.textAlign = "start";
            if (member) ctx.fillStyle = member.displayHexColor;
            else ctx.fillStyle = "white";
            const user_name = uName.replace(/̶/g, "");
            ctx.fillText(user_name, 132, startY + 21 + 46.3 * diff, 330);

            //Level and points
            ctx.font = "16px futura";
            ctx.fillStyle = "white";
            ctx.fillText("Level: " + ec.monthlyLevel, 300, startY + 43 + 45.9 * diff);
            ctx.fillText("Points: " + ec.monthlyScore, 165, startY + 43 + 46.1 * diff);

            //Time hehe
            const hours = (ec.monthlyScore / 300).toFixed(2);
            ctx.fillStyle = "#00ff00";
            ctx.fillText(`(${hours} hrs)`, 380, startY + 43 + 45.9 * diff);

            rownum++;
        }

        const attachment = new MessageAttachment(canvas.toBuffer(), "top.png");
        msg.channel.send(attachment);
    }
});
