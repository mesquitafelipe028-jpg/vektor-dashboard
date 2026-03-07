import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BRAPI_TOKEN = Deno.env.get("BRAPI_TOKEN");
    if (!BRAPI_TOKEN) {
      return new Response(
        JSON.stringify({ error: "BRAPI_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tickers } = await req.json();
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(
        JSON.stringify({ error: "tickers array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Separate crypto tickers from regular tickers
    const cryptoTickers: string[] = [];
    const regularTickers: string[] = [];

    const CRYPTO_MAP: Record<string, string> = {
      bitcoin: "BTC",
      ethereum: "ETH",
      solana: "SOL",
      cardano: "ADA",
      dogecoin: "DOGE",
      bnb: "BNB",
      xrp: "XRP",
      polkadot: "DOT",
    };

    const CRYPTO_REVERSE: Record<string, string> = {};
    Object.entries(CRYPTO_MAP).forEach(([k, v]) => {
      CRYPTO_REVERSE[v.toLowerCase()] = k;
      CRYPTO_REVERSE[k.toLowerCase()] = k;
    });

    tickers.forEach((t: string) => {
      const lower = t.toLowerCase();
      if (CRYPTO_REVERSE[lower]) {
        cryptoTickers.push(lower);
      } else {
        regularTickers.push(t.toUpperCase());
      }
    });

    const results: Record<string, { price: number; change: number; name: string } | null> = {};

    // Fetch regular tickers from BrAPI (batch up to 20)
    if (regularTickers.length > 0) {
      const tickerStr = regularTickers.join(",");
      const url = `https://brapi.dev/api/quote/${tickerStr}?token=${BRAPI_TOKEN}`;
      const res = await fetch(url);
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
        console.error("BrAPI error:", res.status, await res.text());
      }
    }

    // Fetch crypto from BrAPI crypto endpoint
    if (cryptoTickers.length > 0) {
      for (const ct of cryptoTickers) {
        const coinId = CRYPTO_REVERSE[ct] || ct;
        try {
          const url = `https://brapi.dev/api/v2/crypto?coin=${coinId}&currency=BRL&token=${BRAPI_TOKEN}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.coins && data.coins.length > 0) {
              const coin = data.coins[0];
              results[ct] = {
                price: coin.regularMarketPrice ?? 0,
                change: coin.regularMarketChangePercent ?? 0,
                name: coin.coinName || coinId,
              };
            }
          }
        } catch (e) {
          console.error(`Crypto fetch error for ${coinId}:`, e);
        }
      }
    }

    return new Response(JSON.stringify({ quotes: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-quotes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
