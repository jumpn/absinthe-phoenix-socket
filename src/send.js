// @flow

import {append} from "@jumpn/utils-array";

import joinChannel from "./joinChannel";
import notifierCreate from "./notifier/create";
import pushRequest from "./pushRequest";
import updateNotifiers from "./updateNotifiers";

import type {AbsintheSocket, GqlRequest, Notifier} from "./types";

const connectOrJoinChannel = absintheSocket => {
  if (absintheSocket.phoenixSocket.isConnected()) {
    joinChannel(absintheSocket);
  } else {
    // socket ignores connect calls if a connection has already been created
    absintheSocket.phoenixSocket.connect();
  }
};

/**
 * Sends given request and returns an object (notifier) to track its progress
 * (see observe function)
 * 
 * @example
 * import * as AbsintheSocket from "@jumpn/absinthe-phoenix-socket";
 *
 * const operation = `
 *   subscription userSubscription($userId: ID!) {
 *     user(userId: $userId) {
 *       id
 *       name
 *     }
 *   }
 * `;
 *
 * // This example uses a subscription, but the functionallity is the same for
 * // all operation types (queries, mutations and subscriptions)
 * 
 * const notifier = AbsintheSocket.send(absintheSocket, {
 *   operation,
 *   variables: {userId: 10}
 * });
 */
const send = (
  absintheSocket: AbsintheSocket,
  request: GqlRequest<*>
): Notifier<*> => {
  const notifier = notifierCreate(request);

  updateNotifiers(absintheSocket, append([notifier]));

  if (absintheSocket.channelJoinCreated) {
    pushRequest(absintheSocket, notifier);
  } else {
    connectOrJoinChannel(absintheSocket);
  }

  return notifier;
};

export default send;
