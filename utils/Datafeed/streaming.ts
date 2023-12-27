import { parseFullSymbol } from './helpers';
import { Socket, io } from 'socket.io-client';

interface SubscriptionItem {
  subscriberUID: string;
  resolution: string;
  lastDailyBar: any; // Replace 'any' with appropriate bar type
  handlers: { id: string; callback: (bar: any) => void }[];
}

const socket: Socket = io('wss://streamer.cryptocompare.com');
const channelToSubscription: Map<string, SubscriptionItem> = new Map();

socket.on('connect', () => {
  console.log('[socket] Connected');
});

socket.on('disconnect', (reason: string) => {
  console.log('[socket] Disconnected:', reason);
});

socket.on('error', (error: Error) => {
  console.log('[socket] Error:', error);
});

socket.on('m', (data: string) => {
  console.log('[socket] Message:', data);
  const [
    eventTypeStr,
    exchange,
    fromSymbol,
    toSymbol,
    ,
    ,
    tradeTimeStr,
    ,
    tradePriceStr,
  ] = data.split('~');

  if (parseInt(eventTypeStr) !== 0) {
    // Skip all non-trading events
    return;
  }
  const tradePrice: number = parseFloat(tradePriceStr);
  const tradeTime: number = parseInt(tradeTimeStr);
  const channelString: string = `0~${exchange}~${fromSymbol}~${toSymbol}`;
  const subscriptionItem: SubscriptionItem | undefined = channelToSubscription.get(channelString);
  if (subscriptionItem === undefined) {
    return;
  }
  const lastDailyBar: any = subscriptionItem.lastDailyBar; // Replace 'any' with appropriate bar type
  const nextDailyBarTime: number = getNextDailyBarTime(lastDailyBar.time);

  let bar: any; // Replace 'any' with appropriate bar type
  if (tradeTime >= nextDailyBarTime) {
    bar = {
      time: nextDailyBarTime,
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice,
    };
    console.log('[socket] Generate new bar', bar);
  } else {
    bar = {
      ...lastDailyBar,
      high: Math.max(lastDailyBar.high, tradePrice),
      low: Math.min(lastDailyBar.low, tradePrice),
      close: tradePrice,
    };
    console.log('[socket] Update the latest bar by price', tradePrice);
  }
  subscriptionItem.lastDailyBar = bar;

  // Send data to every subscriber of that symbol
  subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
});

function getNextDailyBarTime(barTime: number): number {
  const date: Date = new Date(barTime * 1000);
  date.setDate(date.getDate() + 1);
  return date.getTime() / 1000;
}

export function subscribeOnStream(
  symbolInfo: any, // Replace 'any' with appropriate symbolInfo type
  resolution: string,
  onRealtimeCallback: (bar: any) => void, // Replace 'any' with appropriate bar type
  subscriberUID: string,
  onResetCacheNeededCallback: () => void,
  lastDailyBar: any // Replace 'any' with appropriate bar type
): void {
  const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
  const channelString: string = `0~${parsedSymbol?.exchange}~${parsedSymbol?.fromSymbol}~${parsedSymbol?.toSymbol}`;
  const handler = {
    id: subscriberUID,
    callback: onRealtimeCallback,
  };
  let subscriptionItem: SubscriptionItem | undefined = channelToSubscription.get(channelString);
  if (subscriptionItem) {
    // Already subscribed to the channel, use the existing subscription
    subscriptionItem.handlers.push(handler);
    return;
  }
  subscriptionItem = {
    subscriberUID,
    resolution,
    lastDailyBar,
    handlers: [handler],
  };
  channelToSubscription.set(channelString, subscriptionItem);
  console.log('[subscribeBars]: Subscribe to streaming. Channel:', channelString);
  socket.emit('SubAdd', { subs: [channelString] });
}

export function unsubscribeFromStream(subscriberUID: string): void {
  // Find a subscription with id === subscriberUID
  for (const channelString of Array.from(channelToSubscription.keys())) {
    const subscriptionItem: SubscriptionItem | undefined = channelToSubscription.get(channelString);
    if (subscriptionItem) {
      const handlerIndex: number = subscriptionItem.handlers.findIndex((handler) => handler.id === subscriberUID);

      if (handlerIndex !== -1) {
        // Remove from handlers
        subscriptionItem.handlers.splice(handlerIndex, 1);

        if (subscriptionItem.handlers.length === 0) {
          // Unsubscribe from the channel if it was the last handler
          console.log('[unsubscribeBars]: Unsubscribe from streaming. Channel:', channelString);
          socket.emit('SubRemove', { subs: [channelString] });
          channelToSubscription.delete(channelString);
          break;
        }
      }
    }
  }
}
