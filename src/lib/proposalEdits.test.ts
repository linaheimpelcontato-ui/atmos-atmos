import { describe, it, expect } from "vitest";
import { buildProposalEditsPayload, resolveItemDescription, type EditableDayItem } from "./proposalEdits";

describe("buildProposalEditsPayload", () => {
  it("keeps an edited description attached to the right item after a reorder", () => {
    const items: EditableDayItem[] = [
      { id: "item-a", day_number: 1, item_index: 0, day_label: "Dia 1", description: "Original A" },
      { id: "item-b", day_number: 1, item_index: 1, day_label: "Dia 1", description: "Original B" },
    ];

    // Edit item-b's description (keyed by stable id, as the textarea onChange does).
    const editDescriptions = { "item-b": "Descrição editada B" };

    // Then reorder, same way handleDayDragEnd does: NEW objects, not the
    // same references, item_index reassigned by position. This is exactly
    // the step that broke a position-based key (`items.indexOf(item)` on a
    // clone returns -1).
    const reordered = [items[1], items[0]].map((item, i) => ({ ...item, item_index: i }));

    const { p_items } = buildProposalEditsPayload({
      editItemOrder: reordered,
      editObservations: {},
      editLabels: {},
      editDescriptions,
      fallbackDayLabel: (d) => `Day ${d}`,
    });

    const savedB = p_items.find((i) => i.id === "item-b");
    const savedA = p_items.find((i) => i.id === "item-a");
    expect(savedB?.description).toBe("Descrição editada B");
    expect(savedB?.item_index).toBe(0); // now first after reorder
    expect(savedA?.description).toBe("Original A"); // untouched, preserved
    expect(savedA?.item_index).toBe(1);
  });

  it("falls back to the item's existing description when it wasn't edited", () => {
    const items: EditableDayItem[] = [
      { id: "item-a", day_number: 1, item_index: 0, day_label: "Dia 1", description: "Existing" },
    ];
    const { p_items } = buildProposalEditsPayload({
      editItemOrder: items,
      editObservations: {},
      editLabels: {},
      editDescriptions: {},
      fallbackDayLabel: (d) => `Day ${d}`,
    });
    expect(p_items[0].description).toBe("Existing");
  });

  it("drops items without a stable id (never persisted, can't be targeted for update)", () => {
    const items: EditableDayItem[] = [
      { id: undefined, day_number: 1, item_index: 0, day_label: "Dia 1", description: "x" },
    ];
    const { p_items } = buildProposalEditsPayload({
      editItemOrder: items,
      editObservations: {},
      editLabels: {},
      editDescriptions: {},
      fallbackDayLabel: (d) => `Day ${d}`,
    });
    expect(p_items).toEqual([]);
  });

  it("builds one p_days entry per touched day, falling back to a default label", () => {
    const items: EditableDayItem[] = [
      { id: "item-a", day_number: 2, item_index: 0, day_label: "Dia 2", description: null },
    ];
    const { p_days } = buildProposalEditsPayload({
      editItemOrder: items,
      editObservations: { 2: "Chegar cedo" },
      editLabels: {},
      editDescriptions: {},
      fallbackDayLabel: (d) => `Day ${d}`,
    });
    expect(p_days).toEqual([{ day_number: 2, observation: "Chegar cedo", day_label: "Day 2" }]);
  });
});

describe("resolveItemDescription", () => {
  it("prefers the edited value over the original", () => {
    expect(resolveItemDescription({ id: "x", description: "old" }, { x: "new" })).toBe("new");
  });

  it("falls back to the original when there's no edit for this id", () => {
    expect(resolveItemDescription({ id: "x", description: "old" }, {})).toBe("old");
  });

  it("returns null instead of an empty string", () => {
    expect(resolveItemDescription({ id: "x", description: "old" }, { x: "" })).toBeNull();
  });
});
