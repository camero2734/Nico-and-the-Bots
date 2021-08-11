import MessageContextMenu from "../helpers/context-menus/messageMenu";

const ctxMenu = new MessageContextMenu("🪙 Gold Message");

ctxMenu.setHandler(async (ctx, msg) => {
    ctx.reply({ content: "Test", ephemeral: true });
});

export default ctxMenu;
