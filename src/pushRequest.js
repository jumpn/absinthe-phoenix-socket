// @flow

import {errorsToString as gqlErrorsToString} from "@jumpn/utils-graphql";

import type {GqlError} from "@jumpn/utils-graphql/compat/cjs/types";

import createPushHandler from "./createPushHandler";
import handlePush from "./handlePush";
import notifierNotify from "./notifier/notify";
import notifierRemove from "./notifier/remove";
import notifierRefresh from "./notifier/refresh";
import updateNotifiers from "./updateNotifiers";

import type {AbsintheSocket, Notifier, NotifierPushHandler} from "./types";

type ErrorResponse = {|errors: Array<GqlError>|};

type SubscriptionResponse = {|subscriptionId: string|};

type QueryOrMutationResponse = {|payload: {result: any}|};

type Response = ErrorResponse | SubscriptionResponse | QueryOrMutationResponse;

const onQueryOrMutationResponse = (absintheSocket, notifier, response) => {
  updateNotifiers(absintheSocket, notifierRemove(notifier));

  notifierNotify(notifier, "Result", response.payload.result);
};

const notifyStart = notifier => notifierNotify(notifier, "Start", notifier);

const onSubscriptionResponse = (absintheSocket, notifier, {subscriptionId}) => {
  updateNotifiers(
    absintheSocket,
    notifierRefresh({...notifier, subscriptionId})
  );

  notifyStart(notifier);
};

const onResponse = (absintheSocket, notifier, response) => {
  // it would have been better to check against notifier.operationType,
  // but we are doing this way to allow Flow pick the right disjunction member
  if (response.subscriptionId) {
    onSubscriptionResponse(absintheSocket, notifier, response);
  } else if (response.payload) {
    onQueryOrMutationResponse(absintheSocket, notifier, response);
  }
};

const abortRequest = (absintheSocket, notifier, error) => {
  updateNotifiers(absintheSocket, notifierRemove(notifier));

  notifierNotify(notifier, "Abort", error);
};

const onError = (absintheSocket, notifier, errorMessage) =>
  abortRequest(absintheSocket, notifier, new Error(errorMessage));

const onSucceed = (absintheSocket, notifier, response) => {
  if (response.errors) {
    onError(absintheSocket, notifier, gqlErrorsToString(response.errors));
  } else {
    onResponse(absintheSocket, notifier, response);
  }
};

const onTimeout = (absintheSocket, notifier) =>
  notifierNotify(notifier, "Error", new Error("request: timeout"));

const notifierPushHandler: NotifierPushHandler<Response> = {
  onError,
  onSucceed,
  onTimeout
};

const pushRequest = (
  absintheSocket: AbsintheSocket,
  notifier: Notifier<any>
) => {
  if (notifier.operationType !== "subscription") {
    notifyStart(notifier);
  }

  handlePush(
    absintheSocket.channel.push("doc", notifier.request),
    createPushHandler(notifierPushHandler, absintheSocket, notifier.request)
  );
};

export default pushRequest;
