// @flow

import type {Notifier, Observer} from "../types";

const hasObserver = <Value>(
  notifier: Notifier<Value>,
  observer: Observer<Value>
) => notifier.observers.includes(observer);

export default hasObserver;
