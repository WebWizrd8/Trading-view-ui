// Makes requests to DefinedFi API
export async function makeApiRequest(path: string): Promise<any> {
  try {
    const response = await fetch(`https://graph.defined.fi/graphql/${path}`);
    return response.json();
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
