import { uploadImageToCloudflareStorage } from "../src/Helpers/apis/image";

const arrayBuffer = await Bun.file("./src/Assets/bishop_generic.png").arrayBuffer();

const result = await uploadImageToCloudflareStorage("bishop_generic.png", Buffer.from(arrayBuffer));

console.log(result);
