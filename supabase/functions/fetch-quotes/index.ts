import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Crypto map
    const CRYPTO_MAP: Record<string, string> = {
      bitcoin: "BTC", ethereum: "ETH", solana: "SOL", cardano: "ADA",
      dogecoin: "DOGE", bnb: "BNB", xrp: "XRP", polkadot: "DOT",
    };
    const CRYPTO_IDS = new Set(Object.keys(CRYPTO_MAP));

    // Currency tickers use format "USD-BRL", "EUR-BRL"
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

    const results: Record<string, { price: number; change: number; name: string } | null> = {};

    // 1) Stocks & FIIs via /api/quote
    if (stockTickers.length > 0) {
      const tickerStr = stockTickers.join(",");
      const url = `https://brapi.dev/api/quote/${tickerStr}?token=${BRAPI_TOKEN}`;
      try {
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
          console.error("BrAPI stocks error:", res.status, await res.text());
        }
      } catch (e) {
        console.error("Stocks fetch error:", e);
      }
    }

    // 2) Currencies via /api/v2/currency
    if (currencyTickers.length > 0) {
      for (const pair of currencyTickers) {
        try {
          const url = `https://brapi.dev/api/v2/currency?currency=${pair}&token=${BRAPI_TOKEN}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.currency && data.currency.length > 0) {
              const c = data.currency[0];
              const price = parseFloat(c.bidPrice) || 0;
              const pctChange = parseFloat(c.bidVariation) || 0;
              results[pair] = {
                price,
                change: pctChange,
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

    // 3) Crypto via /api/v2/crypto
    if (cryptoTickers.length > 0) {
      for (const ct of cryptoTickers) {
        try {
          const url = `https://brapi.dev/api/v2/crypto?coin=${ct}&currency=BRL&token=${BRAPI_TOKEN}`;
          const res = await fetch(url);
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
