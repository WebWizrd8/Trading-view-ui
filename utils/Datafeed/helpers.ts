import { BASE_URL } from "@/constants";
import axios from "axios";

// Makes requests to DefinedFi API
export async function makeApiRequest(query: string): Promise<any> {
  try {
    const config = {
      url: BASE_URL,
      method: "post",
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.NEXT_PUBLIC_DEFINED_API,
      },
      data: JSON.stringify({ query }),
    }
    const result = await axios(config);
    return result.data.data;
  } catch (error) {
    throw new Error(`Definedfi request error: ${(error as Error).message}`);
  }
}

// Generates a symbol ID from a pair of coins
export function generateSymbol(exchange: string, fromSymbol: string, toSymbol: string): { short: string, full: string } {
  const short = `${fromSymbol}/${toSymbol}`;
  return {
    short,
    full: `${exchange}:${short}`,
  };
}

// Returns all parts of the symbol
export function parseFullSymbol(fullSymbol: string): { exchange: string, fromSymbol: string, toSymbol: string } | null {
  const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
  if (!match) {
    return null;
  }
  return { exchange: match[1], fromSymbol: match[2], toSymbol: match[3] };
}
