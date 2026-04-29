import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CLICKSIGN_API = "https://app.clicksign.com/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const CLICKSIGN_API_KEY = Deno.env.get("CLICKSIGN_API_KEY");
    if (!CLICKSIGN_API_KEY)
      throw new Error("CLICKSIGN_API_KEY not configured");

    const body = await req.json();
    const { proposal_id, share_token } = body;

    if (!proposal_id || !share_token) {
      return new Response(
        JSON.stringify({ error: "proposal_id and share_token required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate proposal
    const { data: proposal, error: pErr } = await supabase
      .from("proposals")
      .select("id, title, status, share_token, contract_url, prospect_id, prospects(name, email)")
      .eq("id", proposal_id)
      .single();

    if (pErr || !proposal)
      return new Response(JSON.stringify({ error: "Proposal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (proposal.share_token !== share_token)
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (proposal.status !== "approved")
      return new Response(
        JSON.stringify({ error: "Proposal must be approved before signing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    // If contract_url already exists with a clicksign key, return it
    if (proposal.contract_url && proposal.contract_url.startsWith("clicksign:")) {
      const existingKey = proposal.contract_url.replace("clicksign:", "");
      return new Response(
        JSON.stringify({ ok: true, widget_key: existingKey }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prospect = (proposal as any).prospects;
    const signerName = prospect?.name || "Cliente";
    const signerEmail = prospect?.email;

    if (!signerEmail) {
      return new Response(
        JSON.stringify({ error: "Prospect email is required for contract signing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create document from template (or upload)
    // Using Clicksign template-based document creation
    const docRes = await fetch(
      `${CLICKSIGN_API}/templates/documents?access_token=${CLICKSIGN_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: {
            path: `/contracts/${proposal.title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`,
            template: {
              data: {
                nome_cliente: signerName,
                email_cliente: signerEmail,
                proposta_titulo: proposal.title,
                proposta_id: proposal.id,
              },
            },
          },
        }),
      }
    );

    let documentKey: string;

    if (!docRes.ok) {
      // Fallback: create a blank document for signing
      console.log("Template creation failed, trying direct upload approach");
      const blankDocRes = await fetch(
        `${CLICKSIGN_API}/documents?access_token=${CLICKSIGN_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document: {
              path: `/contracts/contrato_${proposal_id.slice(0, 8)}_${Date.now()}.pdf`,
              content_base64: "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDE1MCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE5OQolJUVPRgo=",
              deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              auto_close: true,
              locale: "pt-BR",
              sequence_enabled: false,
            },
          }),
        }
      );

      if (!blankDocRes.ok) {
        const errBody = await blankDocRes.text();
        console.error("Clicksign document creation failed:", errBody);
        return new Response(
          JSON.stringify({ error: "Failed to create contract document" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const blankDocData = await blankDocRes.json();
      documentKey = blankDocData.document.key;
    } else {
      const docData = await docRes.json();
      documentKey = docData.document.key;
    }

    // 2. Add signer
    const signerRes = await fetch(
      `${CLICKSIGN_API}/signers?access_token=${CLICKSIGN_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer: {
            email: signerEmail,
            auths: ["email"],
            name: signerName,
            documentation: "",
            birthday: "",
            has_documentation: false,
            selfie_enabled: false,
            handwritten_enabled: false,
            official_document_enabled: false,
            liveness_enabled: false,
            facial_biometrics_enabled: false,
          },
        }),
      }
    );

    if (!signerRes.ok) {
      const errBody = await signerRes.text();
      console.error("Clicksign signer creation failed:", errBody);
      return new Response(
        JSON.stringify({ error: "Failed to add signer" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signerData = await signerRes.json();
    const signerKey = signerData.signer.key;

    // 3. Add signer to document (create signature list)
    const listRes = await fetch(
      `${CLICKSIGN_API}/lists?access_token=${CLICKSIGN_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list: {
            document_key: documentKey,
            signer_key: signerKey,
            sign_as: "sign",
            message: `Contrato referente à proposta: ${proposal.title}`,
          },
        }),
      }
    );

    if (!listRes.ok) {
      const errBody = await listRes.text();
      console.error("Clicksign list creation failed:", errBody);
      return new Response(
        JSON.stringify({ error: "Failed to link signer to document" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listData = await listRes.json();
    const requestSignatureKey = listData.list.request_signature_key;

    // 4. Save contract reference
    await supabase
      .from("proposals")
      .update({
        contract_url: `clicksign:${requestSignatureKey}`,
        contract_status: "sent",
      })
      .eq("id", proposal_id);

    // 5. Log interaction
    if (proposal.prospect_id) {
      await supabase.from("prospect_interactions").insert({
        prospect_id: proposal.prospect_id,
        type: "note",
        content: "Contrato Clicksign enviado para assinatura digital",
      });
    }

    return new Response(
      JSON.stringify({ ok: true, widget_key: requestSignatureKey }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("clicksign-create-document error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
