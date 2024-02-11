import { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } from "discord.js";
import { TextInputStyle } from "discord-api-types/payloads/v9";
import { userIDs } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { sendViolationNotice } from "../../../Helpers/dema-notice";
import { ViolationType } from "@prisma/client";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: []
});

const MODAL_FIELDS = <const>{
    TV_FIELD: "tv_field"
};

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    // const embed = new EmbedBuilder().setDescription("i don't remember discord.js at all lol");
    // await ctx.send({ embeds: [embed] });

    const member = await ctx.guild.members.fetch(userIDs.myAlt);

    await sendViolationNotice(member, { violation: ViolationType.ConspiracyAndTreason, issuingBishop: "Nico" });

    // const modal = new ModalBuilder().setTitle("My Awesome Form").setCustomId(genModalId({}));

    // const inputComponent = new TextInputBuilder()
    //     .setCustomId(`${MODAL_FIELDS.TV_FIELD}`)
    //     .setLabel("Say something")
    //     .setStyle(TextInputStyle.Short);

    // modal.setComponents([new ActionRowBuilder<TextInputBuilder>().addComponents([inputComponent])]);

    // ctx.showModal(modal);
});

const genModalId = command.addInteractionListener("myForm", [], async (ctx) => {
    if (!ctx.isModalSubmit()) return;

    const inputField = ctx.fields.getTextInputValue(MODAL_FIELDS.TV_FIELD);

    console.log("Got a response from the modal!");
    ctx.reply(`Thank you for saying ${inputField}`);
});

export default command;
