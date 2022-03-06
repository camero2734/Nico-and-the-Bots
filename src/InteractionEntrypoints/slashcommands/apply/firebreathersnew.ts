import { ActionRow, ButtonComponent, Embed, Modal, TextInputComponent } from "@discordjs/builders";
import { ButtonStyle, TextInputStyle } from "discord-api-types/payloads/v9";
import {
    Colors,
    CommandInteraction,
    Interaction,
    InteractionReplyOptions,
    MessageComponentInteraction,
    MessageEditOptions,
    MessagePayload
} from "discord.js";
import { nanoid } from "nanoid";
import { roles, userIDs } from "../../../Configuration/config";
import { CommandError, NULL_CUSTOM_ID } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { sendToStaff } from "../../messageinteractions/staffFBApp";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: []
});

interface Question {
    question: string;
    placeholder: string;
    short?: boolean;
}

interface AnsweredQuestion extends Question {
    answer: string;
}

const PART_ONE: Record<string, Question> = <const>{
    REFERRED_FROM: {
        question: "Where did you find out about our server?",
        placeholder: "Reddit, Twitter, a friend, etc.",
        short: true
    },
    EVENTS_PARTICIPATION: {
        question: "Have you participated in any server events?",
        placeholder: "Answer `yes` or `no`. Feel free to expand on which ones!"
    },
    HELP_PLAN_EVENTS: {
        question: "Would you be willing to host server events?",
        placeholder: "Answer `yes` or `no`. Have any interesting ideas?"
    },
    QUESTIONABLE_BEHAVIOR: {
        question: "Any past issues the staff might find?",
        placeholder: "Please describe as thoroughly as necessary (can include messages, warnings, etc.)"
    }
};

const PART_TWO: Record<string, Question> = <const>{
    LIKE_OR_DISLIKE: {
        question: "Likes/dislikes about DiscordClique community?",
        placeholder: "Be honest!"
    },
    SOCIAL_MEDIA: {
        question: "Social media account you'd like to share?",
        placeholder: "Not required, just useful for gauging your involvement in the community as a whole"
    },
    FINAL_THOUGHTS: {
        question: "Final thoughts / clarifications / feedback?",
        placeholder: "If you don't have, just tell us your favorite song"
    }
};

const FORM: Record<string, typeof PART_ONE> = {
    "SERVER HISTORY": PART_ONE,
    "ABOUT YOU": PART_TWO
};

command.setHandler(async (ctx) => {
    if (!ctx.member.roles.cache.has(roles.staff)) return ctx.reply("Command unavailable!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

    await ctx.reply(await MainMenuPayload(ctx.user.id));
});

async function MainMenuPayload(userId: string): Promise<InteractionReplyOptions & MessageEditOptions> {
    const embed = new Embed()
        .setTitle("Your Firebreathers Application")
        .setDescription(
            `Please fill out all parts below. You may go back and review your answers at any time before submitting.\
            You also can close and come back later; your answers will be saved.
            
            Once you are finished, click the Submit button below.`
        )
        .setColor(Colors.NotQuiteBlack);

    const currentApp = (await getCurrentApplication(userId))?.responseData as Record<string, string> | undefined;

    let allFinished = true;
    const buttons = Object.keys(FORM).map((label, idx) => {
        let sectionFinished = Object.keys(FORM[label]).every((key) => currentApp?.[key]);
        if (!sectionFinished) allFinished = false;

        return new ButtonComponent()
            .setLabel(label)
            .setCustomId(genOpenModalId({ idx: idx.toString() }))
            .setStyle(sectionFinished ? ButtonStyle.Secondary : ButtonStyle.Primary);
    });

    const submitButton = new ButtonComponent()
        .setLabel("Submit")
        .setStyle(ButtonStyle.Success)
        .setCustomId(genSubmitApplicationId({}))
        .setDisabled(!allFinished);

    const actionRow = new ActionRow<ButtonComponent>().setComponents(...buttons, submitButton);

    return { components: [actionRow], embeds: [embed], ephemeral: true };
}

const genOpenModalId = command.addInteractionListener("openFBA", <const>["idx"], async (ctx) => {
    if (!ctx.isButton() || !ctx.component.label) return;

    const formPart = FORM[ctx.component.label];
    if (!formPart) return;

    const prevAnswers = await getPreviousAnswers(ctx.user.id);

    const modal = new Modal()
        .setTitle("Firebreathers Application")
        .setCustomId(genSubmitModalId({ name: ctx.component.label }));

    const textFields = Object.entries(formPart).map(([id, question]) => {
        return new TextInputComponent()
            .setCustomId(id)
            .setLabel(question.question)
            .setPlaceholder(question.placeholder)
            .setStyle(question.short ? TextInputStyle.Short : TextInputStyle.Paragraph)
            .setValue(prevAnswers[id]);
    });

    const wrappedTextFields = textFields.map((x) => new ActionRow<TextInputComponent>().addComponents(x));

    modal.setComponents(...wrappedTextFields);

    ctx.showModal(modal);
});

const genSubmitModalId = command.addInteractionListener("modalCloseFBA", <const>["name"], async (ctx, args) => {
    if (!ctx.isModalSubmit()) return;

    const formPart = FORM[args.name];
    if (!formPart) return;

    const newData: Record<string, string> = {};

    for (let id of Object.keys(formPart)) {
        const value = ctx.fields.getTextInputValue(id);
        newData[id] = value;
    }

    const current = await getCurrentApplication(ctx.user.id);
    const currentData = (current?.responseData as Record<string, string>) || {};

    await prisma.firebreatherApplication.upsert({
        where: { applicationId: current?.applicationId || nanoid() },
        create: {
            responseData: { ...currentData, ...newData },
            userId: ctx.user.id,
            startedAt: new Date()
        },
        update: {
            responseData: { ...currentData, ...newData }
        }
    });

    return ctx.update(await MainMenuPayload(ctx.user.id));
});

const genSubmitApplicationId = command.addInteractionListener("submitFBA", [], async (ctx) => {
    const embed = new Embed()
        .setTitle("FB Application Submitted!")
        .setDescription(
            "Thank you for submitting your application for the Firebreathers role. Staff members will review your application and make a decision as soon as possible.\n\nIn the mean time, I encourage you to listen to Clear."
        )
        .setColor(Colors.DarkGreen);

    await ctx.update({ embeds: [embed], components: [] });

    const { applicationId, responseData } = (await getCurrentApplication(ctx.user.id)) || {};
    if (!applicationId || !responseData) return;

    await prisma.firebreatherApplication.update({
        where: { applicationId },
        data: {
            submittedAt: new Date()
        }
    });

    const transformedData: Record<string, string> = {};
    for (const [id, value] of Object.entries(responseData)) {
        let question: Question | undefined = undefined;
        for (const part of Object.values(FORM)) {
            if (part[id]) question = part[id];
        }
        if (!question) throw new CommandError("You didn't finish the quiz!");

        transformedData[question.question] = value;
    }

    await sendToStaff(ctx.guild, applicationId, transformedData);
});

async function getPreviousAnswers(userId: string): Promise<Record<string, string>> {
    const current = await getCurrentApplication(userId);
    if (!current?.responseData) return {};

    return current.responseData as Record<string, string>;
}

async function getCurrentApplication(userId: string) {
    return await prisma.firebreatherApplication.findFirst({
        orderBy: { startedAt: "desc" },
        where: {
            userId: userId,
            submittedAt: null
        },
        select: { responseData: true, applicationId: true }
    });
}

export default command;
