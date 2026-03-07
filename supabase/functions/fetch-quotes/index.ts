import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const BRAPI_TOKEN = Deno.env.get("BRAPI_TOKEN");
    if (!BRAPI_TOKEN) {
      return jsonResponse({ error: "BRAPI_TOKEN not configured" }, 500);
    }

    let body: { tickers?: string[] };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { tickers } = body;
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return jsonResponse({ error: "tickers array is required" }, 400);
    }

    const CRYPTO_MAP: Record<string, string> = {
      bitcoin: "BTC", ethereum: "ETH", solana: "SOL", cardano: "ADA",
      dogecoin: "DOGE", bnb: "BNB", xrp: "XRP", polkadot: "DOT",
    };
    const CRYPTO_IDS = new Set(Object.keys(CRYPTO_MAP));
    const CURRENCY_REGEX = /^[A-Z]{3}-[A-Z]{3}$/;

    const cryptoTickers: string[] = [];
    const currencyTickers: string[] = [];
    const stockTickers: string[] = [];

    tickers.forEach((t: string) => {
      const lower = t.toLowerCase();
      if (CRYPTO_IDS.has(lower)) {
        cryptoTickers.push(lower);
      } else if (CURRENCY_REGEX.test(t)) {
        currencyTickers.push(t);
      } else {
        stockTickers.push(t);
      }
    });

    const results: Record<string, { price: number; change: number; name: string }> = {};

    // 1) Stocks & FIIs
    if (stockTickers.length > 0) {
      try {
        const tickerStr = stockTickers.join(",");
        const url = `https://brapi.dev/api/quote/${tickerStr}?token=${BRAPI_TOKEN}`;
        const res = await fetchWithTimeout(url);
        if (res.ok) {
          const data = await res.json();
          if (data.results) {
            for (const item of data.results) {
              results[item.symbol] = {
                price: item.regularMarketPrice ?? 0,
                change: item.regularMarketChangePercent ?? 0,
                name: item.longName || item.shortName || item.symbol,
              };
            }
          }
        } else {
          console.error("BrAPI stocks error:", res.status, await res.text());
        }
      } catch (e) {
        console.error("Stocks fetch error:", e);
      }
    }

    // 2) Currencies
    if (currencyTickers.length > 0) {
      for (const pair of currencyTickers) {
        try {
          const url = `https://brapi.dev/api/v2/currency?currency=${pair}&token=${BRAPI_TOKEN}`;
          const res = await fetchWithTimeout(url);
          if (res.ok) {
            const data = await res.json();
            if (data.currency && data.currency.length > 0) {
              const c = data.currency[0];
              results[pair] = {
                price: parseFloat(c.bidPrice) || 0,
                change: parseFloat(c.bidVariation) || 0,
                name: c.name || pair,
              };
            }
          } else {
            console.error(`Currency error for ${pair}:`, res.status);
          }
        } catch (e) {
          console.error(`Currency fetch error for ${pair}:`, e);
        }
      }
    }

    // 3) Crypto
    if (cryptoTickers.length > 0) {
      for (const ct of cryptoTickers) {
        try {
          const url = `https://brapi.dev/api/v2/crypto?coin=${ct}&currency=BRL&token=${BRAPI_TOKEN}`;
          const res = await fetchWithTimeout(url);
          if (res.ok) {
            const data = await res.json();
            if (data.coins && data.coins.length > 0) {
              const coin = data.coins[0];
              results[ct] = {
                price: coin.regularMarketPrice ?? 0,
                change: coin.regularMarketChangePercent ?? 0,
                name: coin.coinName || ct,
              };
            }
          }
        } catch (e) {
          console.error(`Crypto fetch error for ${ct}:`, e);
        }
      }
    }

    return jsonResponse({ quotes: results });
  } catch (error) {
    console.error("Error in fetch-quotes:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});
