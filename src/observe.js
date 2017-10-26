// @flow

import notifierObserve from "./notifier/observe";
import notifierRefresh from "./notifier/refresh";
import updateNotifiers from "./updateNotifiers";

import type {AbsintheSocket, Notifier, Observer} from "./types";

/**
 * Observes given notifier using the provided observer
 *
 * @example
 * import AbsintheSocket from "@jumpn/absinthe-phoenix-socket"
 *
 * const logEvent = eventName => (...args) => console.log(eventName, ...args);
 *
 * AbsintheSocket.observe(absintheSocket, notifier, {
 *   onAbort: logEvent("abort"),
 *   onError: logEvent("error"),
 *   onStart: logEvent("open"),
 *   onValue: logEvent("next")
 * });
 */
const observe = <Value>(
  absintheSocket: AbsintheSocket,
  notifier: Notifier<Value>,
  observer: Observer<Value>
): AbsintheSocket =>
  updateNotifiers(
    absintheSocket,
    notifierRefresh(notifierObserve(notifier, observer))
  );

export default observe;
