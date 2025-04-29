import { GlobalFonts } from '@napi-rs/canvas';
import { createResultsChart } from '../src/InteractionEntrypoints/scheduled/songbattle.consts';

GlobalFonts.registerFromPath(`./src/Assets/fonts/f.ttf`, "Futura");

const { buffer } = await createResultsChart(534);

await Bun.write('./test.png', buffer);
