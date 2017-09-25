// @flow

import hasIn from "@jumpn/utils-composite/compat/cjs/hasIn";
import {
  remove as arrayRemove,
  replace as arrayReplace
} from "@jumpn/utils-array";

import type {
  Subscription,
  SubscriptionMessage,
  SubscriptionObserver
} from "./types";

type SubscriptionObserverMethod = "onAbort" | "onError" | "onOpen" | "onValue";

const create = (message: SubscriptionMessage): Subscription<*> => ({
  message,
  id: undefined,
  observers: []
});

const notify = (
  subscription: Subscription<*>,
  method: SubscriptionObserverMethod,
  data: any
) =>
  subscription.observers.forEach(
    observer => observer[method] && observer[method](data)
  );

const notifyMany = (
  subscriptions: Array<Subscription<*>>,
  method: SubscriptionObserverMethod,
  data: any
) => subscriptions.forEach(subscription => notify(subscription, method, data));

const hasObserver = <Value>(
  subscription: Subscription<Value>,
  observer: SubscriptionObserver<Value>
) => subscription.observers.indexOf(observer) >= 0;

const appendObserver = <Value>(
  {observers, ...otherProps}: Subscription<Value>,
  observer: SubscriptionObserver<Value>
) => ({
  ...otherProps,
  observers: [...observers, observer]
});

const removeObserver = <Value>(
  {observers, ...otherProps}: Subscription<$Supertype<Value>>,
  observer: SubscriptionObserver<Value>
) => ({
  ...otherProps,
  observers: arrayRemove(observers.indexOf(observer), 1, observers)
});

const findIndex = <S: Subscription<*>>(
  subscriptions: Array<S>,
  subscription: S
) => subscriptions.findIndex(hasIn(["message"], subscription.message));

const remove = <S: Subscription<*>>(subscriptions: Array<S>, subscription: S) =>
  arrayRemove(findIndex(subscriptions, subscription), 1, subscriptions);

const update = <S: Subscription<*>>(subscriptions: Array<S>, subscription: S) =>
  arrayReplace(
    findIndex(subscriptions, subscription),
    [subscription],
    subscriptions
  );

const setId = (subscription: Subscription<*>, id?: string) => ({
  ...subscription,
  id
});

const open = (subscription: Subscription<*>, id: string) => {
  const updatedSubscription = setId(subscription, id);

  notify(updatedSubscription, "onOpen", updatedSubscription);

  return updatedSubscription;
};

export {
  appendObserver,
  create,
  hasObserver,
  notify,
  notifyMany,
  open,
  remove,
  removeObserver,
  update
};

export type {Subscription, SubscriptionMessage, SubscriptionObserver};
