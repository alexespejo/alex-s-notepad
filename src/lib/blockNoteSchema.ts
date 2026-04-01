import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { equationBlock } from "@/components/blocks/EquationBlock";

export const appBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    equation: equationBlock(),
  },
});
