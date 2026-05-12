const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  origem_iata?: string;
  destino_iata?: string;
  departDate?: string; // dd/mm/yyyy
  returnDate?: string;
  adults?: number;
  currency?: string;
}

const cache = new Map<string, { at: number; preco: number | null }>();
const TTL_MS = 15 * 60 * 1000;

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const apiKey = Deno.env.get("TEQUILA_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "TEQUILA_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const origem = (body.origem_iata ?? "").toUpperCase().trim();
    const destino = (body.destino_iata ?? "").toUpperCase().trim();
    if (!origem || !destino) {
      return new Response(
        JSON.stringify({ error: "origem_iata e destino_iata são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Datas: padrão hoje+30 .. hoje+45 (ida só)
    const today = new Date();
    const defFrom = new Date(today.getTime() + 30 * 86400000);
    const defTo = new Date(today.getTime() + 45 * 86400000);
    const dateFrom = body.departDate ?? fmtDate(defFrom);
    const dateTo = body.departDate ?? fmtDate(defTo);
    const adults = body.adults ?? 1;
    const currency = body.currency ?? "BRL";

    const cacheKey = `${origem}|${destino}|${dateFrom}|${dateTo}|${body.returnDate ?? ""}|${adults}|${currency}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL_MS) {
      return new Response(
        JSON.stringify({
          preco: hit.preco,
          updatedAt: new Date(hit.at).toISOString(),
          provider: "kiwi-tequila",
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const params = new URLSearchParams({
      fly_from: origem,
      fly_to: destino,
      date_from: dateFrom,
      date_to: dateTo,
      adults: String(adults),
      curr: currency,
      sort: "price",
      limit: "5",
      one_for_city: "1",
    });
    if (body.returnDate) {
      params.set("return_from", body.returnDate);
      params.set("return_to", body.returnDate);
    }

    const url = `https://api.tequila.kiwi.com/v2/search?${params.toString()}`;
    const resp = await fetch(url, { headers: { apikey: apiKey, accept: "application/json" } });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Tequila error", resp.status, txt);
      return new Response(
        JSON.stringify({ error: `Tequila ${resp.status}`, detail: txt.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const first = Array.isArray(data?.data) ? data.data[0] : null;
    const preco = first?.price != null ? Number(first.price) : null;

    cache.set(cacheKey, { at: Date.now(), preco });

    return new Response(
      JSON.stringify({
        preco,
        updatedAt: new Date().toISOString(),
        provider: "kiwi-tequila",
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("flight-price exception", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "internal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
