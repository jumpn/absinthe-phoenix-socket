// @flow

import {Channel, Socket as PhoenixSocket} from "phoenix";

import type {
  GqlOperationType,
  GqlRequest
} from "@jumpn/utils-graphql/compat/cjs/types";

type Event = "Abort" | "Cancel" | "Error" | "Start" | "Value";

type Observer<Value> = {
  onAbort?: (error: Error) => any,
  onCancel?: () => any,
  onError?: (error: Error) => any,
  onStart?: () => any,
  onValue?: (value: Value) => any
};

type Notifier<Result> = {
  observers: Array<Observer<Result>>,
  operationType: GqlOperationType,
  request: GqlRequest<*>,
  subscriptionId?: string
};

type AbsintheSocket = {
  channel: Channel,
  isJoining: boolean,
  notifiers: Array<Notifier<any>>,
  phoenixSocket: PhoenixSocket
};

type PushHandler<Response: Object> = {
  onError: (errorMessage: string) => any,
  onSucceed: (response: Response) => any,
  onTimeout: () => any
};

type NotifierPushHandler<Response: Object> = {
  onError: (
    absintheSocket: AbsintheSocket,
    notifier: Notifier<any>,
    errorMessage: string
  ) => any,
  onSucceed: (
    absintheSocket: AbsintheSocket,
    notifier: Notifier<any>,
    response: Response
  ) => any,
  onTimeout: (absintheSocket: AbsintheSocket, notifier: Notifier<any>) => any
};

export type {
  AbsintheSocket,
  Event,
  GqlRequest,
  Notifier,
  Observer,
  NotifierPushHandler,
  PushHandler
};
