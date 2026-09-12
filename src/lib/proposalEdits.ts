/**
 * Builds the payload for save_public_proposal_edits from the admin edit
 * buffers in ProposalPublic.tsx. Pure so the "edit description, then
 * reorder, then save" sequence can be tested without mounting the page.
 *
 * Items are keyed by their stable row id, never array position: position
 * shifts under drag-and-drop reordering, and handleDayDragEnd clones items
 * on reorder (new object references), so `someArray.indexOf(item)` on a
 * reordered clone returns -1 and silently drops whatever was keyed by it.
 */
export type EditableDayItem = {
  id?: string;
  day_number: number;
  item_index: number;
  day_label: string | null;
  description: string | null;
};

export type ProposalEditsPayload = {
  p_days: { day_number: number; observation: string; day_label: string }[];
  p_items: { id: string; description: string | null; item_index: number }[];
};

export function buildProposalEditsPayload(params: {
  editItemOrder: EditableDayItem[];
  editObservations: Record<number, string>;
  editLabels: Record<number, string>;
  editDescriptions: Record<string, string>;
  fallbackDayLabel: (dayNumber: number) => string;
}): ProposalEditsPayload {
  const { editItemOrder, editObservations, editLabels, editDescriptions, fallbackDayLabel } = params;

  const dayNumsTouched = [...new Set([
    ...editItemOrder.map((i) => i.day_number),
    ...Object.keys(editObservations).map(Number),
    ...Object.keys(editLabels).map(Number),
  ])];

  const p_days = dayNumsTouched.map((d) => ({
    day_number: d,
    observation: editObservations[d] || "",
    day_label: editLabels[d] || fallbackDayLabel(d),
  }));

  const p_items = editItemOrder
    .filter((item): item is EditableDayItem & { id: string } => !!item.id)
    .map((item) => ({
      id: item.id,
      description: resolveItemDescription(item, editDescriptions),
      item_index: item.item_index,
    }));

  return { p_days, p_items };
}

export function resolveItemDescription(
  item: Pick<EditableDayItem, "id" | "description">,
  editDescriptions: Record<string, string>
): string | null {
  const edited = item.id ? editDescriptions[item.id] : undefined;
  return (edited ?? item.description) || null;
}
