import {
  makeApiRequest,
  generateSymbol,
  parseFullSymbol,
} from './helpers';

interface ConfigurationData {
  supported_resolutions: string[];
  exchanges: { value: string; name: string; desc: string }[];
  symbols_types: { name: string; value: string }[];
}

export default {
  onReady: (callback: (data: any) => void) => {
    console.log('[onReady]: Method call');
    setTimeout(() => callback(configurationData));
  },
  searchSymbols: async (
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (symbols: any[]) => void,
  ): Promise<void> => {
    console.log('[searchSymbols]: Method call');
    const symbols = await getAllSymbols();
    const newSymbols = symbols.filter((symbol: any) => {
      const isExchangeValid = exchange === '' || symbol.exchange === exchange;
      const isFullSymbolContainsInput =
        symbol.full_name.toLowerCase().indexOf(userInput.toLowerCase()) !== -1;
      return isExchangeValid && isFullSymbolContainsInput;
    });
    onResultReadyCallback(newSymbols);
  },
  resolveSymbol: async (
    symbolName: string,
    onSymbolResolvedCallback: (info: any) => void,
    onResolveErrorCallback: (error: string) => void,
    extension: any,
  ): Promise<void> => {
    console.log('[resolveSymbol]: Method call', symbolName);
    const symbols = await getAllSymbols();
    const symbolItem = symbols.find(({ full_name }: any) => full_name === symbolName);
    if (!symbolItem) {
      console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
      onResolveErrorCallback('Cannot resolve symbol');
      return;
    }
    // Symbol information object
    const symbolInfo = {
      ticker: symbolItem.full_name,
      name: symbolItem.symbol,
      description: symbolItem.description,
      type: symbolItem.type,
      session: '24x7',
      timezone: 'Etc/UTC',
      exchange: symbolItem.exchange,
      minmov: 1,
      pricescale: 100,
      has_intraday: false,
      visible_plots_set: 'ohlc',
      has_weekly_and_monthly: false,
      supported_resolutions: configurationData.supported_resolutions,
      volume_precision: 2,
      data_status: 'streaming',
    };
    onSymbolResolvedCallback(symbolInfo);
  },
  getBars: async (
    symbolInfo: any,
    resolution: string,
    periodParams: any,
    onHistoryCallback: (bars: any[], meta: any) => void,
    onErrorCallback: (error: any) => void,
  ): Promise<void> => {
    const { from, to, firstDataRequest } = periodParams;
    console.log('[getBars]: Method call', symbolInfo, resolution, from, to);
    const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
    const urlParameters = {
      e: parsedSymbol.exchange,
      fsym: parsedSymbol.fromSymbol,
      tsym: parsedSymbol.toSymbol,
      toTs: to,
      limit: 2000,
    };
    const query = Object.keys(urlParameters)
      .map((name) => `${name}=${encodeURIComponent(urlParameters[name])}`)
      .join('&');
    try {
      const data = await makeApiRequest(`data/histoday?${query}`);
      if (data.Response && data.Response === 'Error' || data.Data.length === 0) {
        // "noData" should be set if there is no data in the requested period
        onHistoryCallback([], { noData: true });
        return;
      }
      let bars: any[] = [];
      data.Data.forEach((bar: any) => {
        if (bar.time >= from && bar.time < to) {
          bars = [
            ...bars,
            {
              time: bar.time * 1000,
              low: bar.low,
              high: bar.high,
              open: bar.open,
              close: bar.close,
            },
          ];
        }
      });
      console.log(`[getBars]: returned ${bars.length} bar(s)`);
      onHistoryCallback(bars, { noData: false });
    } catch (error) {
      console.log('[getBars]: Get error', error);
      onErrorCallback(error);
    }
  },
};

const configurationData: ConfigurationData = {
  supported_resolutions: ['1D', '1W', '1M'],
  exchanges: [
    { value: 'Bitfinex', name: 'Bitfinex', desc: 'Bitfinex' },
    { value: 'Kraken', name: 'Kraken', desc: 'Kraken bitcoin exchange' },
  ],
  symbols_types: [{ name: 'crypto', value: 'crypto' }],
};


// Obtains all symbols for all exchanges supported by Defined.fi
async function getAllSymbols(): Promise<any[]> {
  const data = await makeApiRequest('listTopTokens/');
  let allSymbols: any[] = [];

  for (const exchange of configurationData.exchanges) {
    const pairs = data.Data[exchange.value].pairs;

    for (const leftPairPart of Object.keys(pairs)) {
      const symbols = pairs[leftPairPart].map((rightPairPart: any) => {
        const symbol = generateSymbol(exchange.value, leftPairPart, rightPairPart);
        return {
          symbol: symbol.short,
          full_name: symbol.full,
          description: symbol.short,
          exchange: exchange.value,
          type: 'crypto',
        };
      });
      allSymbols = [...allSymbols, ...symbols];
    }
  }
  return allSymbols;
}

