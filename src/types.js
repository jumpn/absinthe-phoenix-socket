// @flow

import {Channel, Socket as PhoenixClient} from "phoenix";

type SubscriptionObserver<Value> = {
  onAbort: (error: Error) => any,
  onError: (error: Error) => any,
  onOpen: (subscription: Subscription<Value>) => any,
  onValue: (value: Value) => any
};

type SubscriptionMessage = {
  query: string,
  variables?: Object
};

type Subscription<Value> = {
  message: SubscriptionMessage,
  observers: Array<SubscriptionObserver<Value>>,
  id?: string
};

type ObservationLink<Value> = {
  isObserving: () => boolean,
  unobserve: () => Promise<Subscription<Value>>
};

type AbsintheSubscriber = {
  channel: Channel,
  isJoining: boolean,
  phoenixClient: PhoenixClient,
  // $FlowFixMe: figure out why this is throwing an error
  subscriptions: Array<Subscription<any>>
};

export type {
  AbsintheSubscriber,
  ObservationLink,
  Subscription,
  SubscriptionMessage,
  SubscriptionObserver
};
