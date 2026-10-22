import { formatUnits, parseUnits } from "viem";
import { celo } from "viem/chains";
import { TOKENS } from "@/config/app";

const TEXTILE_API = "https://app.textilecredit.com";

export type QuoteDirection = "wARS_to_USDT" | "USDT_to_wARS";

export type TextileQuoteResponse =
  | {
      status: "preview";
      direction: QuoteDirection;
      sellSymbol: string;
      buySymbol: string;
      sellAmount: number;
      buyAmount: number;
      feeAmount: number;
      availableSellAmount: number;
      warsPerUsdt: number;
      referenceWarsPerUsdt: number | null;
      updatedAt: string;
    }
  | {
      status: "no_quote";
      direction: QuoteDirection;
      sellSymbol: string;
      buySymbol: string;
      reason: string;
      availableSellAmount: number;
      referenceWarsPerUsdt: number | null;
      updatedAt: string;
    }
  | {
      status: "error";
      error: string;
    };

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const direction: QuoteDirection =
      body?.direction === "USDT_to_wARS" ? "USDT_to_wARS" : "wARS_to_USDT";
    const rawAmount = Number(body?.amount);

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return Response.json(
        { status: "error", error: "Ingresá un monto mayor a cero." } satisfies TextileQuoteResponse,
        { status: 400 },
      );
    }

    const sell = direction === "wARS_to_USDT" ? TOKENS.wARS : TOKENS.USDT;
    const buy = direction === "wARS_to_USDT" ? TOKENS.USDT : TOKENS.wARS;

    let sellAmountWei: string;
    try {
      sellAmountWei = parseUnits(rawAmount.toFixed(sell.decimals), sell.decimals).toString();
    } catch {
      return Response.json(
        { status: "error", error: "Monto inválido." } satisfies TextileQuoteResponse,
        { status: 400 },
      );
    }

    const [previewRes, priceRes] = await Promise.all([
      fetch(`${TEXTILE_API}/v2/rfq/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: celo.id,
          sellToken: sell.address.toLowerCase(),
          buyToken: buy.address.toLowerCase(),
          sellAmount: sellAmountWei,
        }),
        cache: "no-store",
      }),
      fetch(`${TEXTILE_API}/api/price?pair=wars-usdt&chainId=${celo.id}`, {
        cache: "no-store",
      }).catch(() => null),
    ]);

    const previewJson = await previewRes.json().catch(() => null);
    const priceJson = priceRes ? await priceRes.json().catch(() => null) : null;
    const midPrice = typeof priceJson?.price === "number" && priceJson.price > 0 ? priceJson.price : null;
    const referenceWarsPerUsdt = midPrice ? 1 / midPrice : null;

    if (!previewRes.ok || !previewJson?.data) {
      const msg = previewJson?.error?.message ?? `Textile FX respondió HTTP ${previewRes.status}`;
      return Response.json(
        { status: "error", error: msg } satisfies TextileQuoteResponse,
        { status: 502 },
      );
    }

    const d = previewJson.data;
    const availableSellAmount = Number(
      formatUnits(BigInt(d.availableSellAmount ?? "0"), sell.decimals),
    );

    if (d.status !== "preview") {
      return Response.json({
        status: "no_quote",
        direction,
        sellSymbol: sell.symbol,
        buySymbol: buy.symbol,
        reason: d.reason ?? d.status ?? "no_quote",
        availableSellAmount,
        referenceWarsPerUsdt,
        updatedAt: new Date().toISOString(),
      } satisfies TextileQuoteResponse);
    }

    const sellAmount = Number(formatUnits(BigInt(d.sellAmount), sell.decimals));
    const buyAmount = Number(formatUnits(BigInt(d.buyAmount), buy.decimals));
    const feeAmount = Number(formatUnits(BigInt(d.feeAmount ?? "0"), sell.decimals));
    const warsPerUsdt =
      direction === "wARS_to_USDT" ? sellAmount / buyAmount : buyAmount / sellAmount;

    return Response.json({
      status: "preview",
      direction,
      sellSymbol: sell.symbol,
      buySymbol: buy.symbol,
      sellAmount,
      buyAmount,
      feeAmount,
      availableSellAmount,
      warsPerUsdt,
      referenceWarsPerUsdt,
      updatedAt: new Date().toISOString(),
    } satisfies TextileQuoteResponse);
  } catch {
    return Response.json(
      {
        status: "error",
        error: "No se pudo conectar con Textile FX. Intentá de nuevo en unos segundos.",
      } satisfies TextileQuoteResponse,
      { status: 502 },
    );
  }
}
