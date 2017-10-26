// @flow

import handlePush from "./handlePush";
import notifierNotifyAll from "./notifier/notifyAll";
import pushRequest from "./pushRequest";

import type {AbsintheSocket} from "./types";

const createChannelJoinHandler = absintheSocket => ({
  onError: (errorMessage: string) =>
    notifierNotifyAll(
      absintheSocket.notifiers,
      "Error",
      new Error(`channel join: ${errorMessage}`)
    ),

  onSucceed: () => {
    absintheSocket.isJoining = false;

    absintheSocket.notifiers.forEach(notifier =>
      pushRequest(absintheSocket, notifier)
    );
  },

  onTimeout: () =>
    notifierNotifyAll(
      absintheSocket.notifiers,
      "Error",
      new Error("channel join: timeout")
    )
});

const joinChannel = (absintheSocket: AbsintheSocket) =>
  handlePush(
    absintheSocket.channel.join(),
    createChannelJoinHandler(absintheSocket)
  );

export default joinChannel;
