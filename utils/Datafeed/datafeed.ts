import { ResolutionString } from '@/public/static/charting_library/charting_library';
import { makeApiRequest, generateSymbol, parseFullSymbol } from './helpers';
import { subscribeOnStream, unsubscribeFromStream } from './streaming';
import { IDatafeedChartApi, LibrarySymbolInfo, ResolveCallback } from '@/public/static/charting_library/datafeed-api';

interface SymbolInfo {
  full_name: string;
  exchange: string;
  fromSymbol: string;
  toSymbol: string;
}

const lastBarsCache = new Map<string, any>(); // You can replace 'any' with a specific bar type

// DatafeedConfiguration interface
interface DatafeedConfiguration {
  supported_resolutions: string[];
  exchanges: { value: string; name: string; desc: string }[];
  symbols_types: { name: string; value: string }[];
}

const configurationData: DatafeedConfiguration = {
  supported_resolutions: ['1D', '1W', '1M'],
  exchanges: [
    { value: 'Bitfinex', name: 'Bitfinex', desc: 'Bitfinex' },
    { value: 'Kraken', name: 'Kraken', desc: 'Kraken bitcoin exchange' },
  ],
  symbols_types: [{ name: 'crypto', value: 'crypto' }],
};

async function getAllSymbols() {
  const data = await makeApiRequest('data/v3/all/exchanges');
  let allSymbols: any[] = [];

  for (const exchange of configurationData.exchanges) {
    const pairs = data.Data[exchange.value].pairs;

    for (const leftPairPart of Object.keys(pairs)) {
      const symbols = pairs[leftPairPart].map((rightPairPart: string) => {
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

const datafeed: any = {
  onReady: (callback: (config: DatafeedConfiguration) => void) => {
    console.log('[onReady]: Method call');
    setTimeout(() => callback(configurationData));
  },

  searchSymbols: async (
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (symbols: any[]) => void,
  ) => {
    console.log('[searchSymbols]: Method call');
    const symbols = await getAllSymbols();
    const newSymbols = symbols.filter((symbol) => {
      const isExchangeValid = exchange === '' || symbol.exchange === exchange;
      const isFullSymbolContainsInput = symbol.full_name.toLowerCase().includes(userInput.toLowerCase());
      return isExchangeValid && isFullSymbolContainsInput;
    });
    onResultReadyCallback(newSymbols);
  },

  resolveSymbol: async (
    symbolName: string,
    onResolve: ResolveCallback,
    onError: (error: string) => void,
    extension: any
  ) => {
    console.log('[resolveSymbol]: Method call', symbolName);
    const symbols = await getAllSymbols();
    const symbolItem = symbols.find(({ full_name }) => full_name === symbolName);
    if (!symbolItem) {
      console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
      onError('cannot resolve symbol');
      return;
    }

    const symbolInfo: LibrarySymbolInfo = {
      ticker: symbolItem.full_name,
      full_name: symbolItem.full_name,
      name: symbolItem.symbol,
      description: symbolItem.description,
      type: symbolItem.type,
      session: '24x7',
      timezone: 'Etc/UTC',
      exchange: symbolItem.exchange,
      minmov: 1,
      pricescale: 100,
      has_intraday: false,
      // has_no_volume: true,
      has_weekly_and_monthly: false,
      supported_resolutions: configurationData.supported_resolutions as ResolutionString[],
      volume_precision: 2,
      data_status: 'streaming',
      listed_exchange: "NYSE",
      format: 'price',
    };


    console.log('[resolveSymbol]: Symbol resolved', symbolName);
    onResolve(symbolInfo);
  },

  getBars: async (
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: any,
    onHistoryCallback: (bars: any[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: any) => void
  ) => {
    const { from, to, firstDataRequest } = periodParams;
    console.log('[getBars]: Method call', symbolInfo, resolution, from, to);
    const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
    const urlParameters = {
      e: parsedSymbol?.exchange,
      fsym: parsedSymbol?.fromSymbol,
      tsym: parsedSymbol?.toSymbol,
      toTs: to,
      limit: 2000,
    };
    const query = Object.keys(urlParameters)
      .map(name => `${name}=${encodeURIComponent(urlParameters[name as keyof typeof urlParameters])}`)
      .join('&');
    try {
      const data = await makeApiRequest(`data/histoday?${query}`);
      if (data.Response && data.Response === 'Error' || data.Data.length === 0) {
        onHistoryCallback([], { noData: true });
        return;
      }
      let bars: any[] = [];
      data.Data.forEach((bar: any) => {
        if (bar.time >= from && bar.time < to) {
          bars = [...bars, {
            time: bar.time * 1000,
            low: bar.low,
            high: bar.high,
            open: bar.open,
            close: bar.close,
          }];
        }
      });
      if (firstDataRequest) {
        lastBarsCache.set(symbolInfo.full_name, { ...bars[bars.length - 1] });
      }
      console.log(`[getBars]: returned ${bars.length} bar(s)`);
      onHistoryCallback(bars, { noData: false });
    } catch (error) {
      console.log('[getBars]: Get error', error);
      onErrorCallback(error);
    }
  },

  subscribeBars: (
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: any) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void,
  ) => {
    console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
    subscribeOnStream(
      symbolInfo,
      resolution,
      onRealtimeCallback,
      subscriberUID,
      onResetCacheNeededCallback,
      lastBarsCache.get(symbolInfo.full_name),
    );
  },

  unsubscribeBars: (subscriberUID: string) => {
    console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
    unsubscribeFromStream(subscriberUID);
  },
};

export default datafeed;
