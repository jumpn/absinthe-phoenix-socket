// @flow

import type {Notifier, Observer} from "../types";

const observe = <Value>(
  {observers, ...rest}: Notifier<Value>,
  observer: Observer<Value>
) => ({
  ...rest,
  observers: [...observers, observer]
});

export default observe;
