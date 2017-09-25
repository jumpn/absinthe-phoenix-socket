// @flow

import gqlErrorsToString from "@jumpn/utils-graphql/compat/cjs/errorsToString";
import hasIn from "@jumpn/utils-composite/compat/cjs/hasIn";
import {Socket as PhoenixClient} from "phoenix";

import type {GqlError} from "@jumpn/utils-graphql/compat/cjs/types";
import type {Message} from "phoenix";

import * as withSubscription from "./subscription";

import type {
  AbsintheSubscriber,
  ObservationLink,
  Subscription,
  SubscriptionMessage,
  SubscriptionObserver
} from "./types";

type SubscriptionOkResponse = {
  subscriptionId: string,
  errors?: Array<GqlError>
};

type SubscriptionPayload<Result> = {
  result: Result,
  subscriptionId: string
};

const removeSubscription = (subscriber, subscription) => {
  subscriber.subscriptions = withSubscription.remove(
    subscriber.subscriptions,
    subscription
  );
};

const unsubscribe = (subscriber, subscription) =>
  new Promise((resolve, reject) =>
    subscriber.channel
      .push("unsubscribe", {subscriptionId: subscription.id})
      .receive("ok", () => {
        resolve(subscription);
        removeSubscription(subscriber, subscription);
      })
      .receive("error", error => {
        reject(error);
        unsubscribe(subscriber, subscription);
      })
      .receive("timeout", () =>
        withSubscription.notify(subscription, "onError", "unsubscribe: timeout")
      )
  );

const unobserve = (subscriber, subscription, observer) => {
  const updatedSubscription = withSubscription.removeObserver(
    subscription,
    observer
  );

  return updatedSubscription.observers.length > 0
    ? Promise.resolve(updatedSubscription)
    : unsubscribe(subscriber, updatedSubscription);
};

const findSubscriptionBy = key => (subscriber: AbsintheSubscriber, value: *) =>
  subscriber.subscriptions.find(hasIn([key], value));

const findSubscriptionByMessage = findSubscriptionBy("message");

// we should be using a generic Value and share it between SubscriptionObserver
// and ObservationLink, but if we do so, then we reach
// https://github.com/facebook/flow/issues/1395
const createObservationLink = (
  subscriber: AbsintheSubscriber,
  message: SubscriptionMessage,
  observer: SubscriptionObserver<*>
): ObservationLink<*> => ({
  isObserving: () => {
    const subscription = findSubscriptionByMessage(subscriber, message);

    return subscription
      ? withSubscription.hasObserver(subscription, observer)
      : false;
  },
  unobserve: () => {
    const subscription = findSubscriptionByMessage(subscriber, message);

    return subscription && withSubscription.hasObserver(subscription, observer)
      ? unobserve(subscriber, subscription, observer)
      : Promise.reject(new Error("already unobserved"));
  }
});

const updateSubscription = (subscriber, subscription) => {
  subscriber.subscriptions = withSubscription.update(
    subscriber.subscriptions,
    subscription
  );

  return subscriber;
};

/**
 * Links observer to subscription 
 * 
 * @example
 * import Subscriber from "@jumpn/absinthe-phoenix-subscriber"
 *
 * const logEvent = eventName => (...args) => console.log(eventName, ...args);
 *
 * const observationLink = Subscriber.observe(subcriber, subscription, {
 *   onAbort: logEvent("abort"),
 *   onError: logEvent("error"),
 *   onOpen: logEvent("open"),
 *   onValue: logEvent("next")
 * });
 */
const observe = <Value>(
  subscriber: AbsintheSubscriber,
  subscription: Subscription<Value>,
  observer: SubscriptionObserver<Value>
): ObservationLink<$Subtype<Value>> =>
  createObservationLink(
    updateSubscription(
      subscriber,
      withSubscription.appendObserver(subscription, observer)
    ),
    subscription.message,
    observer
  );

const onSubscriptionTimeout = subscription => () =>
  withSubscription.notify(
    subscription,
    "onError",
    new Error("subscription: timeout")
  );

const abortSubscription = (subscriber, subscription, error) => {
  withSubscription.notify(subscription, "onAbort", error);

  removeSubscription(subscriber, subscription);
};

const onSubscriptionError = (subscriber, subscription) => (
  errorMessage: string
) => abortSubscription(subscriber, subscription, new Error(errorMessage));

const onSubscriptionOk = (subscriber, subscription) => (
  response: SubscriptionOkResponse
) => {
  if (response.errors) {
    abortSubscription(
      subscriber,
      subscription,
      new Error(gqlErrorsToString(response.errors))
    );
  } else {
    updateSubscription(
      subscriber,
      withSubscription.open(subscription, response.subscriptionId)
    );
  }
};

const sendSubscription = (subscriber, subscription) =>
  subscriber.channel
    .push("doc", subscription.message)
    .receive("ok", onSubscriptionOk(subscriber, subscription))
    .receive("error", onSubscriptionError(subscriber, subscription))
    .receive("timeout", onSubscriptionTimeout(subscription));

const onChannelJoinTimeout = subscriber => () =>
  withSubscription.notifyMany(
    subscriber.subscriptions,
    "onError",
    new Error("channel join: timeout")
  );

const onChannelJoinError = subscriber => (errorMessage: string) =>
  withSubscription.notifyMany(
    subscriber.subscriptions,
    "onError",
    new Error(`channel join: ${errorMessage}`)
  );

const onChannelJoinDone = subscriber => () => {
  subscriber.isJoining = false;

  subscriber.subscriptions.forEach(subscription =>
    sendSubscription(subscriber, subscription)
  );
};

const joinChannel = subscriber =>
  subscriber.channel
    .join()
    .receive("ok", onChannelJoinDone(subscriber))
    .receive("error", onChannelJoinError(subscriber))
    .receive("timeout", onChannelJoinTimeout(subscriber));

const connectOrJoin = subscriber => {
  subscriber.isJoining = true;

  if (subscriber.phoenixClient.isConnected()) {
    joinChannel(subscriber);
  } else {
    subscriber.phoenixClient.connect();
  }
};

const isJoined = subscriber =>
  subscriber.phoenixClient.isConnected() && !subscriber.isJoining;

const createSubscription = (subscriber, message) => {
  const subscription = withSubscription.create(message);

  subscriber.subscriptions = [...subscriber.subscriptions, subscription];

  return subscription;
};

/**
 * Creates a subscription to the given message
 * 
 * @example
 * import Subscriber from "@jumpn/absinthe-phoenix-subscriber";
 * 
 * const query = `
 *   subscription userSubscription($userId: ID!) {
 *     user(userId: $userId) {
 *       id
 *       name
 *     }
 *   }
 * `;
 * 
 * const subscription = Subscriber.subscribe(subscriber, {
 *   query,
 *   variables: {userId: 10}
 * });
 */
const subscribe = (
  subscriber: AbsintheSubscriber,
  message: SubscriptionMessage
): Subscription<*> => {
  const subscription = createSubscription(subscriber, message);

  if (!isJoined(subscriber)) {
    connectOrJoin(subscriber);
  } else {
    sendSubscription(subscriber, subscription);
  }

  return subscription;
};

const onConnectionClose = subscriber => () =>
  withSubscription.notifyMany(
    subscriber.subscriptions,
    "onError",
    new Error("connection: close")
  );

const findSubscriptionById = findSubscriptionBy("id");

const onSubscriptionData = (
  subscriber: AbsintheSubscriber,
  {payload}: Message<SubscriptionPayload<*>>
) => {
  const subscription = findSubscriptionById(subscriber, payload.subscriptionId);

  if (subscription) {
    withSubscription.notify(subscription, "onValue", payload.result);
  }
};

const onMessage = subscriber => (response: Message<>) => {
  if (response.event === "subscription:data") {
    onSubscriptionData(subscriber, response);
  }
};

const onConnectionOpen = subscriber => () => {
  if (subscriber.isJoining) {
    joinChannel(subscriber);
  }
};

const absintheChannelName = "__absinthe__:control";

/**
 * Creates a subscriber using the given PhoenixClient instance
 *
 * @example
 * import Subscriber from "@jumpn/absinthe-phoenix-subscriber";
 * import {Socket as PhoenixClient} from "phoenix";

 * const subscriber = Subscriber.create(
 *   new PhoenixClient("ws://localhost:4000/socket")
 * );
 */
const create = (phoenixClient: PhoenixClient): AbsintheSubscriber => {
  const subscriber: AbsintheSubscriber = {
    phoenixClient,
    channel: phoenixClient.channel(absintheChannelName),
    isJoining: false,
    subscriptions: []
  };

  phoenixClient.onOpen(onConnectionOpen(subscriber));
  phoenixClient.onMessage(onMessage(subscriber));
  phoenixClient.onClose(onConnectionClose(subscriber));

  return subscriber;
};

export {create, observe, subscribe};

export type {AbsintheSubscriber, ObservationLink};
