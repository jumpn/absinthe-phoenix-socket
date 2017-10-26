// @flow

import {remove as arrayRemove} from "@jumpn/utils-array";

import type {Notifier, Observer} from "../types";

const unobserve = <Value>(
  {observers, ...rest}: Notifier<Value>,
  observer: Observer<Value>
) => ({
  ...rest,
  observers: arrayRemove(observers.indexOf(observer), 1, observers)
});

export default unobserve;
