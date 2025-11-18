import type { ColorResolvable, RoleColorsResolvable } from "discord.js";

type DeleteRole = {
  type: "delete";
  name: string;
};
const DeleteRole = (name: string): DeleteRole => ({ type: "delete", name });

type RecolorRole = {
  type: "changeColor";
  name: string;
  to: RoleColorsResolvable;
};
const RecolorRole = (name: string, to: ColorResolvable): RecolorRole => ({
  type: "changeColor",
  name,
  to: { primaryColor: to },
});

type RenameRole = {
  type: "rename";
  from: string;
  to: string;
  expectedColor: RoleColorsResolvable;
};
const RenameRole = (from: string, to: string, expectedColor: ColorResolvable): RenameRole => ({
  type: "rename",
  from,
  to,
  expectedColor: { primaryColor: expectedColor },
});

type RenameAndRecolorRole = {
  type: "changeAndRename";
  from: string;
  to: string;
  colorTo: RoleColorsResolvable;
};
const RenameAndRecolorRole = (from: string, to: string, colorTo: ColorResolvable): RenameAndRecolorRole => ({
  type: "changeAndRename",
  from,
  to,
  colorTo: { primaryColor: colorTo },
});

type AddRole = {
  type: "add";
  name: string;
  color: ColorResolvable;
};
const AddRole = (name: string, color: ColorResolvable): AddRole => ({ type: "add", name, color });

type NoChange = {
  type: "noChange";
  name: string;
  expectedColor: RoleColorsResolvable;
};
const NoChange = (name: string, expectedColor: ColorResolvable): NoChange => ({
  type: "noChange",
  name,
  expectedColor: { primaryColor: expectedColor },
});

export type Change = DeleteRole | RecolorRole | RenameRole | RenameAndRecolorRole | AddRole | NoChange;

export const changes: Array<Change> = [
  AddRole("Breach Peach", "#ffceb1"),
  NoChange("No Pink Intended", "#b18f95"),
  NoChange("Goldies Station", "#a38a00"),
  RenameAndRecolorRole("Bandito Green", "RAWFERN", "#8a9a5b"),
  RenameAndRecolorRole("Cheetah Tan", "Garbeige", "#ab9d85"),
  RenameAndRecolorRole("Vulture Brown", "Brownstairs", "#915919"),
  NoChange("Regional at Blue", "#6485a9"),

  DeleteRole("Trapdoorange"),
  RenameRole("Lavaish", "Trapdoororange", "#ff6c0e"),
  AddRole("Pear in My Heart", "#d1e231"),
  RenameAndRecolorRole("Jumpsuit Green", "Center Moss", "#63b76c"),
  NoChange("Holding on to Blue", "#4a83e6"),
  NoChange("At The Risk Of Feeling Plum", "#673147"),
  RenameRole("Dema Gray", "City Walls Gray", "#9b9bad"),
  RenameRole("Pink You Out", "Rosebot Voices", "#eeb8dd"),
  NoChange("Kitchen Pink", "#c54b8c"),
  NoChange("Mulberry Jam", "#b00b69"),
  AddRole("Ruby", "#b8000f"),
  RenameRole("Maroontines in the Night", "My Blood", "#800000"),
  NoChange("Fairly Lilac", "#ccacea"),
  RenameAndRecolorRole("Pet Cheetah Purple", "Redecorgrape", "#9966cc"),
  RenameRole("Pantaloon Purple", "Quiet is Violet", "#8f81ff"),
  NoChange("Navygating", "#0c0caa"),
  DeleteRole("Never Teal It"),
  RenameRole("Ned Blue", "Never Teal It", "#008fa2"),
  NoChange("Forest Green", "#11806a"),

  RenameRole("Paladin Pink", "Bubblegum for Hands", "#ff7d9a"),
  NoChange("Rebel Red", "#d30e3b"),
  AddRole("Glowing Eyes", "#ecfe2a"),
  RenameRole("Trees Green", "Chlorine Green", "#a9ff9f"),
  RenameAndRecolorRole("March to the Cyan", "March to the Seafoam", "#9fe2bf"),
  NoChange("Formidablue", "#81ccdd"),
  NoChange("Midwest Indigo", "#4b00b2"),
  DeleteRole("Ode to Pink"),
  AddRole("Cottonwood Candy", "#ffadbf"),
  RenameAndRecolorRole("The Red and Go", "Coral Radio", "#ff5c5c"),
  DeleteRole("Ochrecompensate"),
  DeleteRole("Torchbearer Orange"),
  AddRole("Rust Around the Rim", "#d97448"),
  AddRole("Heatless Fire", "#ffa52c"),
  NoChange("Bandito Yellow", "#fce300"),
  AddRole("The Lime", "#53ee5b"),
  NoChange("Oh Mint Believer", "#c4fccc"),
  RenameRole("Silver Screen", "Heavydirtystone", "#bec2cb"),

  NoChange("Clancy Black", "#000001"),
  NoChange("DMAORG White", "#ffffff"),

  AddRole("The Contrast", "#e0115f"),
  AddRole("Sky Away", "#00bfff"),
];
