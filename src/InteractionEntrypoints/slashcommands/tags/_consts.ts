import { minutesToMilliseconds } from "date-fns";
import Fuse from "fuse.js";
import moize from "moize";
import { prisma } from "../../../Helpers/prisma-init";

// AUTOCOMPLETE
const fuseOptions = {
  shouldSort: true,
  includeScore: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  minMatchCharLength: 1,
};

async function _getTagNameSearcher() {
  const res = await prisma.tag.findMany({ select: { name: true } });

  const tagNames = res.map((r) => r.name);

  return new Fuse(tagNames, fuseOptions);
}
export const getTagNameSearcher = moize.promise(_getTagNameSearcher, {
  maxAge: minutesToMilliseconds(1),
});
