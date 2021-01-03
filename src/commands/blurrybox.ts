import { channelIDs, userIDs } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { Economy } from "database/entities/Economy";
import { MessageTools } from "helpers";
import { Connection } from "typeorm";

export default new Command({
    name: "blurrybox",
    description: "Opens a deliciously nutritious blurrybox for your enjoyment for the low cost of **one blurrytoken**",
    category: "Economy",
    usage: "!blurrybox",
    example: "!blurrybox",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        if (msg.channel.id !== channelIDs.commands && msg.author.id != userIDs.me) {
            throw new CommandError("You can only use !blurrybox in <#470331990231744512>");
        }

        const userEconomy =
            (await connection.getRepository(Economy).findOne({ id: msg.author.id })) ||
            new Economy({ id: msg.author.id });

        if (userEconomy.blurrytokens < 1) throw new CommandError("You don't have any tokens!");

        const prizes = [];
        class Prize {
            constructor(public description: string, public chance: number, public execute: () => string) {}
            async award() {
                const output = this.execute();
                const embed = MessageTools.textEmbed(`${msg.member}, ${output}`);
                await msg.channel.send(embed);
                return embed;
            }
        }

        prizes.push(
            new Prize("a steal", 20, () => {
                userEconomy.steals++;
                return "You won a `steal`! Simply use `!steal @user` to take one of their ingots. If they have a `block`, your attempt will fail 70% of the time and they will lose a block while you lose your steal.";
            })
        );
        prizes.push(
            new Prize("a block", 5, () => {
                userEconomy.blocks++;
                return "You won a `block`! You have a 70% chance of being protected from one !steal.";
            })
        );
        prizes.push(
            new Prize("an extra ingot", 15, () => {
                userEconomy.ingots++;
                return "You won an extra ingot!";
            })
        );
        prizes.push(
            new Prize("500 Credits", 25, () => {
                userEconomy.credits += 500;
                return "You won " + 500 + " credits!";
            })
        );
        prizes.push(
            new Prize("1000 Credits", 10, () => {
                userEconomy.credits += 1000;
                return "You won " + 1000 + " credits!";
            })
        );
        prizes.push(
            new Prize("2500 Credits", 5, () => {
                userEconomy.credits += 2500;
                return "You won " + 2500 + " credits!";
            })
        );
        prizes.push(
            new Prize("nothing", 20, () => {
                return "You won nothing :(";
            })
        );

        const prizes_array = [];
        for (const prize of prizes) {
            for (let i = 0; i < prize.chance; i++) {
                prizes_array.push(prize);
            }
        }

        //CHOOSE PRIZE
        const chosen_prize = prizes_array[Math.floor(Math.random() * prizes_array.length)];
        const prizeEmbed = await chosen_prize.award();
        userEconomy.blurrytokens--;
        userEconomy.ingots++;

        if (userEconomy.ingots >= 10) {
            userEconomy.ingots = userEconomy.ingots % 10;
            userEconomy.credits += 2500;
            userEconomy.trophies++;

            await msg.channel.send(
                prizeEmbed.setDescription(
                    "You reached 10 ingots and won a trophy and 2500 credits! Check the trophy leaderboard with `!trophyboard`"
                )
            );
        }

        await connection.manager.save(userEconomy);

        const response = `You have **${userEconomy.blurrytokens} blurrytoken${
            userEconomy.blurrytokens === 1 ? "" : "s"
        }** remaining and you now have **${userEconomy.ingots} ingot${userEconomy.ingots === 1 ? "" : "s"}**!`;

        await msg.channel.send(prizeEmbed.setDescription(response));
    }
});
