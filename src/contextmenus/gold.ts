import MessageContextMenu from "../helpers/context-menus/messageMenu";

export default new MessageContextMenu("Give gold").setHandler(async (ctx, msg) => {
    console.log(`Got ctx menu interaction on: ${msg.content}`);
    ctx.reply({ content: "Test", ephemeral: true });
});
