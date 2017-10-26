// @flow

import notifierRefresh from "./notifier/refresh";
import notifierUnobserve from "./notifier/unobserve";
import updateNotifiers from "./updateNotifiers";

import type {AbsintheSocket, Notifier, Observer} from "./types";

/**
 * Detaches observer from notifier, removes it if it has no observers,
 * and unsubscribes subscription if it was notifying one
 *
 * @example
 * import * as AbsintheSocket from "@jumpn/absinthe-phoenix-socket";
 *
 * AbsintheSocket.unobserve(absintheSocket, notifier, observer);
 */
const unobserve = (
  absintheSocket: AbsintheSocket,
  notifier: Notifier<any>,
  observer: Observer<any>
): AbsintheSocket => {
  updateNotifiers(
    absintheSocket,
    notifierRefresh(notifierUnobserve(notifier, observer))
  );

  return absintheSocket;
};

export default unobserve;
