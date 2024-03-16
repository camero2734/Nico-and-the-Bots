// 
import { GlobalFonts, createCanvas, loadImage } from "@napi-rs/canvas";
import F from "../src/Helpers/funcs";

GlobalFonts.registerFromPath(`./src/Assets/fonts/f.ttf`, "Futura");
GlobalFonts.registerFromPath(`./src/Assets/fonts/FiraCode/Regular.ttf`, "FiraCode");
GlobalFonts.registerFromPath(`./src/Assets/fonts/ArialNarrow/Regular.ttf`, "'Arial Narrow'");

const image = await loadImage("./src/Assets/bishop_generic.png");

const canvas = createCanvas(500, 500);
const ctx = canvas.getContext("2d");

ctx.drawImage(image, 0, 0, 500, 500);

const imgData = ctx.getImageData(0, 0, 500, 500);
const data = imgData.data;

const colorFrom = [0, 0, 0];
const colorTo = [147, 174, 219];

for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const brightness = Math.min(0.2 + ((r + g + b) / 3) / 255, 1);

    data[i] = F.lerp(brightness, colorFrom[0], colorTo[0]);
    data[i + 1] = F.lerp(brightness, colorFrom[1], colorTo[1]);
    data[i + 2] = F.lerp(brightness, colorFrom[2], colorTo[2]);
}

ctx.putImageData(imgData, 0, 0);

await Bun.write("./tasks/districtOut.png", canvas.toBuffer("image/png"));
