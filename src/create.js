// @flow

import {Socket as PhoenixSocket} from "phoenix";

import type {Message} from "phoenix";

import joinChannel from "./joinChannel";
import notifierFind from "./notifier/find";
import notifierNotify from "./notifier/notify";
import notifierRemove from "./notifier/remove";
import updateNotifiers from "./updateNotifiers";

import type {AbsintheSocket} from "./types";

type SubscriptionPayload<Result> = {
  result: Result,
  subscriptionId: string
};

const createConnectionCloseError = () => new Error("connection: close");

const mutationOnConnectionClose = (absintheSocket, notifier) => {
  updateNotifiers(absintheSocket, notifierRemove(notifier));

  notifierNotify(notifier, "Abort", createConnectionCloseError());
};

const notifierOnConnectionClose = absintheSocket => notifier => {
  if (notifier.operationType === "mutation") {
    mutationOnConnectionClose(absintheSocket, notifier);
  } else {
    notifierNotify(notifier, "Error", createConnectionCloseError());
  }
};

const onConnectionClose = absintheSocket => () => {
  if (absintheSocket.notifiers.length === 0) return;

  // phoenix socket reconnects automatically, but channel does not, this is why
  // we are setting isJoining flag to true (only if there are notifiers),
  // so in onConnectionOpen handler we can detect this and rejoin channel
  absintheSocket.isJoining = true;

  absintheSocket.notifiers.forEach(notifierOnConnectionClose(absintheSocket));
};

const onSubscriptionData = (
  absintheSocket: AbsintheSocket,
  {payload}: Message<SubscriptionPayload<any>>
) => {
  const notifier = notifierFind(
    absintheSocket.notifiers,
    "subscriptionId",
    payload.subscriptionId
  );

  if (notifier) {
    notifierNotify(notifier, "Value", payload.result);
  }
};

const onMessage = absintheSocket => (response: Message<>) => {
  if (response.event === "subscription:data") {
    onSubscriptionData(absintheSocket, response);
  }
};

const joinChannelIfNeeded = absintheSocket => {
  if (absintheSocket.notifiers.length === 0) {
    absintheSocket.isJoining = false;
  } else {
    joinChannel(absintheSocket);
  }
};

const onConnectionOpen = absintheSocket => () => {
  if (absintheSocket.isJoining) {
    joinChannelIfNeeded(absintheSocket);
  }
};

const absintheChannelName = "__absinthe__:control";

/**
 * Creates an Absinthe Socket using the given Phoenix Socket instance
 *
 * @example
 * import * as AbsintheSocket from "@jumpn/absinthe-phoenix-socket";
 * import {Socket as PhoenixSocket} from "phoenix";

 * const absintheSocket = AbsintheSocket.create(
 *   new PhoenixSocket("ws://localhost:4000/socket")
 * );
 */
const create = (phoenixSocket: PhoenixSocket): AbsintheSocket => {
  const absintheSocket: AbsintheSocket = {
    phoenixSocket,
    channel: phoenixSocket.channel(absintheChannelName),
    isJoining: false,
    notifiers: []
  };

  phoenixSocket.onOpen(onConnectionOpen(absintheSocket));
  phoenixSocket.onMessage(onMessage(absintheSocket));
  phoenixSocket.onClose(onConnectionClose(absintheSocket));

  return absintheSocket;
};

export default create;
