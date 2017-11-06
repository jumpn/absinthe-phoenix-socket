# @jumpn/absinthe-phoenix-socket

> Absinthe Phoenix Socket

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<!-- END doctoc -->

- [Features](#features)
- [Installation](#installation)
  - [Using npm](#using-npm)
  - [Using yarn](#using-yarn)
- [Types](#types)
- [API](#api)
  - [cancel](#cancel)
  - [create](#create)
  - [observe](#observe)
  - [send](#send)
  - [toObservable](#toobservable)
  - [unobserve](#unobserve)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features

-   Immutable functional API
    > All received and returned objects with the exception of AbsintheSocket
    >   instances (there are plans to make this immutable too) are treated in an
    >   immutable way. Objects have no methods and instead we provide independant
    >   stateless functions to interact with them.
-   Lazy connect / join
    > If provided phoenix socket instance is not connected, then instead of
    >   connecting at creation time, connection will be established on the next
    >   invocation of [send](#send).
-   Handle pending operations on connection lost
    > Pending mutations will be aborted, queries will be resent, and subscriptions
    >   reestablished.
-   Cancellable requests
    > Calling [cancel](#cancel) removes given notifier from absintheSocket instance
    >   and sends a Cancel event to all its observers and unsubscribes in case it
    >   holds a subscription request.
-   Observer support of recoverable errors
    > Since connection lost is handled, then two events needs to exist to represent
    >   this fact: Error (recoverable), Abort (unrecoverable).
-   Multiple observers per request
    > Calling [send](#send) returns a notifier which allows attaching any number of
    >   observers that will be notified when result arrives.
-   Observer interaction depending on operation type
    > For the case of subscriptions, _Start_ event is dispatched when the
    >   subscription is established, while for the other types
    >   (queries and mutations), when the request is sent.

## Installation

### Using [npm](https://docs.npmjs.com/cli/npm)

    $ npm install --save @jumpn/absinthe-phoenix-socket

### Using [yarn](https://yarnpkg.com)

    $ yarn add @jumpn/absinthe-phoenix-socket

## Types

```flowtype
// from @jumpn/utils-graphql
type GqlRequest<Variables: void | Object = void> = {
  operation: string,
  variables?: Variables
};

type Event = "Abort" | "Cancel" | "Error" | "Start" | "Result";

type Observer<Result> = {
  onAbort: (error: Error) => any,
  onCancel: (error: Error) => any,
  onError: (error: Error) => any,
  onStart: () => any,
  onResult: (result: Result) => any
};

type Notifier<Result> = {
  observers: Array<Observer<Result>>,
  operationType: GqlOperationType,
  request: GqlRequest<*>,
  subscriptionId?: string
};

type AbsintheSocket = {
  channel: Channel,
  channelJoinCreated: boolean,
  notifiers: Array<Notifier<any>>,
  phoenixSocket: PhoenixSocket
};
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### cancel

Cancels a notifier sending a Cancel event to all its observers and
unsubscribing in case it holds a subscription request

**Parameters**

-   `absintheSocket` **AbsintheSocket** 
-   `notifier` **Notifier&lt;any>** 

**Examples**

```javascript
import * as AbsintheSocket from "@jumpn/absinthe-phoenix-socket";

AbsintheSocket.cancel(absintheSocket, notifier);
```

Returns **AbsintheSocket** 

### create

Creates an Absinthe Socket using the given Phoenix Socket instance

**Parameters**

-   `phoenixSocket` **PhoenixSocket** 

**Examples**

```javascript
import * as AbsintheSocket from "@jumpn/absinthe-phoenix-socket";
import {Socket as PhoenixSocket} from "phoenix";

const absintheSocket = AbsintheSocket.create(
  new PhoenixSocket("ws://localhost:4000/socket")
);
```

Returns **AbsintheSocket** 

### observe

Observes given notifier using the provided observer

**Parameters**

-   `absintheSocket` **AbsintheSocket** 
-   `notifier` **Notifier&lt;Result>** 
-   `observer` **Observer&lt;Result>** 

**Examples**

```javascript
import AbsintheSocket from "@jumpn/absinthe-phoenix-socket"

const logEvent = eventName => (...args) => console.log(eventName, ...args);

const updatedNotifier = AbsintheSocket.observe(absintheSocket, notifier, {
  onAbort: logEvent("abort"),
  onError: logEvent("error"),
  onStart: logEvent("open"),
  onResult: logEvent("result")
});
```

Returns **AbsintheSocket** 

### send

Sends given request and returns an object (notifier) to track its progress
(see observe function)

**Parameters**

-   `absintheSocket` **AbsintheSocket** 
-   `request` **GqlRequest&lt;any>** 

**Examples**

```javascript
import * as AbsintheSocket from "@jumpn/absinthe-phoenix-socket";

const operation = `
  subscription userSubscription($userId: ID!) {
    user(userId: $userId) {
      id
      name
    }
  }
`;

// This example uses a subscription, but the functionallity is the same for
// all operation types (queries, mutations and subscriptions)

const notifier = AbsintheSocket.send(absintheSocket, {
  operation,
  variables: {userId: 10}
});
```

Returns **Notifier&lt;any>** 

### toObservable

Creates an Observable that will follow the given notifier

**Parameters**

-   `absintheSocket` **AbsintheSocket** 
-   `notifier` **Notifier&lt;Result>** 
-   `options` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)?**  (optional, default `{}`)
    -   `options.onError` **function (error: [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)): [undefined](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined)?** 
    -   `options.onStart` **function (notifier: Notifier&lt;Result>): [undefined](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined)?** 
    -   `options.unsubscribe` **function (): [undefined](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined)?** 

Returns **Observable** 

### unobserve

Detaches observer from notifier

**Parameters**

-   `absintheSocket` **AbsintheSocket** 
-   `notifier` **Notifier&lt;any>** 
-   `observer` **Observer&lt;any>** 

**Examples**

```javascript
import * as AbsintheSocket from "@jumpn/absinthe-phoenix-socket";

AbsintheSocket.unobserve(absintheSocket, notifier, observer);
```

Returns **AbsintheSocket** 

## License

[MIT](LICENSE.txt) :copyright: **Jumpn Limited** / Mauro Titimoli (mauro@jumpn.com)
