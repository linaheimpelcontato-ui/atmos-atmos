export type RequestContact = { origin: "turista" | "imersao"; email?: string | null; phone?: string | null };
export type LinkedRequestProspect = { id: string; stage_id: string | null; segment: string; email: string | null; phone: string | null };
const normalizedEmail = (value?: string | null) => (value || "").trim().toLowerCase();
const normalizedPhone = (value?: string | null) => (value || "").replace(/[^0-9]/g, "");

/** Read-only counterpart of sync_request_prospect's segment + (email OR phone).
 * Page through the segment because historical contacts may contain whitespace
 * or phone formatting; an ilike(email) alone cannot match the trigger's rules.
 * Creation belongs to the request trigger, never to a browser lookup fallback.
 */
export async function findRequestProspect(
  db: { from: (table: "prospects") => any }, contact: RequestContact,
): Promise<LinkedRequestProspect | null> {
  const email = normalizedEmail(contact.email);
  const phone = normalizedPhone(contact.phone);
  if (!email && !phone) return null;
  const segment = contact.origin === "turista" ? "b2c" : "b2b";
  const matches = new Map<string, LinkedRequestProspect>();
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from("prospects")
      .select("id, stage_id, segment, email, phone").eq("segment", segment)
      .order("id").range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message || "Não foi possível verificar o vínculo no CRM.");
    for (const prospect of (data || []) as LinkedRequestProspect[]) {
      if (prospect.segment === segment && ((email && normalizedEmail(prospect.email) === email)
        || (phone && normalizedPhone(prospect.phone) === phone))) matches.set(prospect.id, prospect);
    }
    if (matches.size > 1) throw new Error("Mais de um cliente corresponde ao contato neste segmento. Revise os vínculos no CRM.");
    if (!data || data.length < pageSize) break;
  }
  return matches.values().next().value ?? null;
}
