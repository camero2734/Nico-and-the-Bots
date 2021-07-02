import { channelIDs, roles, userIDs } from "configuration/config";
import { CommandError, CommandOptions, CommandRunner, ExtendedContext } from "configuration/definitions";
import { Economy } from "database/entities/Economy";
import { Item } from "database/entities/Item";
import { GuildMember, MessageAttachment, MessageEmbed, Role, Snowflake, TextChannel } from "discord.js";
import { MessageTools } from "helpers";
import F from "helpers/funcs";
import { ButtonStyle, ComponentActionRow, ComponentButton, ComponentType } from "slash-create";
import { Mutex } from "async-mutex";
import { Counter } from "database/entities/Counter";
import { createCanvas, loadImage } from "canvas";
import { sendViolationNotice } from "helpers/dema-notice";

export const Options: CommandOptions = {
    description: "Opens the shop menu for color roles",
    options: []
};

const CONTRABAND_WORDS = ["jumpsuit", "bandito", "rebel", "torch", "clancy", "dmaorg"];

export const Executor: CommandRunner = async (ctx) => {
    await ctx.defer(true);

    const colorRoles = roles.colors;

    class ColorCategory {
        public requiresDE = false;
        public credits: number;
        public level: number;
        public roles: Role[];
        constructor(roleIDs: Snowflake[], opts: Partial<{ level: number; credits: number; DE: boolean }>) {
            this.level = opts.level || 0;
            this.credits = opts.credits || 0;
            this.requiresDE = opts.DE || false;
            this.roles = roleIDs.map((id) => ctx.channel.guild.roles.cache.get(id) as Role);
        }

        unlockedFor(member: GuildMember, userEconomy: Economy) {
            const meetsDE = this.requiresDE ? member.roles.cache.has(roles.deatheaters) : true;
            return this.level <= userEconomy.level && meetsDE;
        }

        purchasable(roleID: string, member: GuildMember, userEconomy: Economy): boolean {
            if (!this.unlockedFor(member, userEconomy)) return false; // Checks level and DE
            const role = this.roles.find((r) => r.id === roleID);
            if (!role) return false; // Invalid role ID

            if (userEconomy.credits < this.credits) return false; // Check credits

            return true;
        }
    }

    const tier1 = new ColorCategory(Object.values(colorRoles.tier1), { credits: 7500, level: 10 });
    const tier2 = new ColorCategory(Object.values(colorRoles.tier2), { credits: 15000, level: 20 });
    const tier3 = new ColorCategory(Object.values(colorRoles.tier3), { credits: 25000, level: 50 });
    const tier4 = new ColorCategory(Object.values(colorRoles.tier4), { credits: 50000, level: 100 });
    const DExclusive = new ColorCategory(Object.values(colorRoles.DExclusive), { credits: 50000, level: 100, DE: true }); // prettier-ignore

    const userEconomy =
        (await ctx.connection.getRepository(Economy).findOne({ userid: ctx.member.id })) ||
        new Economy({ userid: ctx.member.id });

    const userRoles = (await ctx.connection.getRepository(Item).find({ identifier: ctx.user.id, type: "ColorRole" }) || []).map(r => r.title); // prettier-ignore

    const categories = {
        "The Scaled Back Collection": {
            id: "ScaledBack",
            data: tier1,
            description: "Looking for basic colors? The Scaled Back Collection has you covered."
        },
        "Violets of Vetomo": {
            id: "Violet",
            data: tier2,
            description: "Ready to branch out into more vibrant colors? Violets of Vetomo is here to help."
        },
        "Saturation Creations": {
            id: "Saturation",
            data: tier3,
            description:
                "Do you want to stand out in the crowd? Saturation Creations provides a variety of bright, colors to increase your saturation. Because saturation is happiness™."
        },
        "DEMA's Dreamers": {
            id: "DEMA",
            data: tier4,
            description:
                "VIOLATION WARNING: This page contains highly controlled contraband items. The Sacred Municipality of Dema will take any action necessary to keep its citizens safe from this dangerous material."
        },
        "Here Be Dragons": {
            id: "Dragons",
            data: DExclusive,
            description:
                "Trash the Dragon sponsored this collection himself. Browse this exclusive merchandise as a Firebreather."
        }
    };

    const MenuEmbed = new MessageEmbed()
        .setAuthor("Good Day Dema® Discord Shop", "https://i.redd.it/wd53naq96lr61.png")
        .setColor("#D07A21")
        .setDescription(
            [
                "Welcome to the official Discord color role shop! Feel free to peruse the shop to add a little more... saturation.",
                "",
                "Choose one of the categories below. A submenu will open that allows you to purchase roles within that category.",
            ].join("\n")
        )
        .setFooter("Any product purchased must have been approved by The Sacred Municipality of Dema. Under the terms established by DMA ORG, any unapproved items are considered contraband and violators will be referred to Dema Council."); // prettier-ignore

    const MenuComponents: ComponentActionRow[] = [
        {
            type: ComponentType.ACTION_ROW,
            components: Object.entries(categories).map(([label, item], idx) => {
                const unlocked = item.data.unlockedFor(ctx.member, userEconomy);
                return {
                    type: ComponentType.BUTTON,
                    style: unlocked ? ButtonStyle.PRIMARY : ButtonStyle.SECONDARY,
                    label: unlocked
                        ? `${idx + 1}. ${label}`
                        : `Level ${item.data.level}${item.data.requiresDE ? ` & Firebreathers` : ""}`,
                    custom_id: unlocked ? item.id : "nothing",
                    emoji: unlocked ? undefined : { name: "🔒" }
                };
            })
        }
    ];

    for (const [name, item] of Object.entries(categories)) {
        MenuEmbed.addField(name, item.data.roles.map((r) => `<@&${r.id}>`).join("\n") + "\n\u2063");
    }

    await ctx.send({ components: MenuComponents, embeds: [MenuEmbed.toJSON()] });

    // If a button with custom_id "MainMenu" is pressed, the main menu is resent
    ctx.registerComponent("MainMenu", (btnCtx) => {
        btnCtx.editOriginal({ components: MenuComponents, embeds: [MenuEmbed.toJSON()] });
    });

    // Add button press listeners for the categories
    for (const [name, item] of Object.entries(categories)) {
        // When the category is pressed, send the appropriate submenu
        ctx.registerComponent(item.id, async (btnCtx) => {
            const embed = new MessageEmbed()
                .setAuthor("Good Day Dema® Discord Shop", "https://i.redd.it/wd53naq96lr61.png")
                .setTitle(name)
                .setColor("#D07A21")
                .setDescription(`*${item.description}*\n`)
                .addField("Credits", `${item.data.credits}`)
                .addField("\u200b", item.data.roles.map((r) => `<@&${r.id}>`).join("\n") + "\n\u2063")
                .setFooter("Any product purchased must have been approved by The Sacred Municipality of Dema. Under the terms established by DMA ORG, any unapproved items are considered contraband and violators will be referred to Dema Council."); // prettier-ignore

            const categoryButtons: ComponentButton[] = item.data.roles.map((role) => {
                const contraband = CONTRABAND_WORDS.some((w) => role.name.toLowerCase().includes(w));
                const ownsRole = userRoles.includes(role.id);
                const defaultColor = contraband ? ButtonStyle.DESTRUCTIVE : ButtonStyle.PRIMARY;

                return {
                    type: ComponentType.BUTTON,
                    style: ownsRole ? ButtonStyle.SECONDARY : defaultColor,
                    label: role.name,
                    custom_id: !ownsRole ? role.id : "nothing",
                    emoji: contraband ? { name: "🩸" } : undefined
                };
            });
            categoryButtons.push({
                type: ComponentType.BUTTON,
                style: ButtonStyle.DESTRUCTIVE,
                label: "Go back",
                custom_id: "MainMenu"
            });

            const components: ComponentActionRow[] = MessageTools.allocateButtonsIntoRows(categoryButtons);

            btnCtx.editParent({ embeds: [embed.toJSON()], components });
        });

        // Add button press listeners for the color items themselves
        for (const role of item.data.roles) {
            const BUY_ID = `buy:${role.id}`;

            // Change some stuff if the item is contraband
            const contraband = CONTRABAND_WORDS.some((w) => role.name.toLowerCase().includes(w));
            let title = "Good Day Dema® Discord Shop";
            const shopImage = contraband ? "https://i.imgur.com/eQEaugK.png" : "https://i.redd.it/wd53naq96lr61.png";
            const footer = contraband
                ? F.randomizeLetters("thEy mustn't know you were here. it's al l propaganda. no one should ever find out About this. you can never tell anyone about thiS -- for The sake of the others' survIval, you muSt keep this silent. it's al l propa ganda. we mUst keeP silent. no one can know. no one can know. no o ne c an kn ow_", 0.1) // prettier-ignore
                : "This product has been approved by The Sacred Municipality of Dema. Under the terms established by DMA ORG, any unapproved items are considered contraband and violators will be referred to Dema Council.";
            if (contraband) title = F.randomizeLetters(title);

            const roleEmbed = new MessageEmbed()
                .setAuthor(title, shopImage)
                .setTitle(role.name)
                .setColor(role.color)
                .setDescription(`Would you like to purchase this item?`)
                .addField("Cost", `${item.data.credits}`, true)
                .addField("Your credits", `${userEconomy.credits} → ${userEconomy.credits - item.data.credits}`, true)
                .setFooter(footer); // prettier-ignore

            if (contraband) {
                roleEmbed.addField(
                    "WARNING",
                    "This item has been identified as contraband by The Sacred Municipality of Dema. Good Day Dema® does not endorse this product and it has been flagged for take-down. For your own safety, you must leave."
                );
            }

            const roleComponents: ComponentActionRow[] = MessageTools.allocateButtonsIntoRows([
                {
                    type: ComponentType.BUTTON,
                    style: ButtonStyle.SUCCESS,
                    label: "Purchase",
                    custom_id: BUY_ID,
                    emoji: { name: "💰" }
                },
                {
                    type: ComponentType.BUTTON,
                    style: ButtonStyle.DESTRUCTIVE,
                    label: "Go back",
                    custom_id: item.id // Will go back to parent menu
                }
            ]);

            // Listen for role being pressed in subcategory
            ctx.registerComponent(role.id, async (btnCtx) => {
                btnCtx.editOriginal({
                    embeds: [roleEmbed.toJSON()],
                    components: roleComponents
                });
            });

            // When someone clicks "Purchase"
            ctx.registerComponent(BUY_ID, async (btnCtx) => {
                // Purchase
                if (!item.data.purchasable(role.id, ctx.member, userEconomy))
                    throw new CommandError("You do not have enough credits to purchase this item");

                // Add role to user's color roles list
                if (userRoles.some((r) => r === role.id)) throw new CommandError("You already have this role!");
                const colorRoleItem = new Item({ identifier: ctx.user.id, type: "ColorRole", title: role.id });
                await ctx.connection.manager.save(colorRoleItem);

                // Update user's economy
                userEconomy.credits -= item.data.credits;
                await ctx.connection.manager.save(userEconomy);

                roleEmbed.fields = [];
                roleEmbed.setDescription(`Success! You are now a proud owner of the ${role.name} role. Thank you for shopping with Good Day Dema®.`); // prettier-ignore
                roleEmbed.addField(
                    `How do I "equip" this role?`,
                    "To actually apply this role, simply use the `/role color` command. You may only have one color role applied at a time (but you can own as many as you want)."
                );
                let sent = false;
                try {
                    const dm = await ctx.member.createDM();
                    dm.send({ embeds: [roleEmbed] });
                    sent = true;
                } catch (e) {
                    //
                } finally {
                    roleEmbed.fields = [];
                    roleEmbed.description += ` This receipt was${sent ? "" : " unable to be"} forwarded to your DMs. ${sent ? "" : "Please save a screenshot of this as proof of purchase in case any errors occur."}` // prettier-ignore
                    btnCtx.editOriginal({ embeds: [roleEmbed.toJSON()], components: [] });
                }

                if (contraband)
                    sendViolationNotice(ctx.member, ctx.channel, ctx.connection, {
                        identifiedAs: "POSSESSION OF ILLEGAL CONTRABAND",
                        reason: `Possession of ${role.name.toUpperCase()}`,
                        found: "in possession of regulated materials that have been outlawed by the Dema Council"
                    });
            });
        }
    }
};
