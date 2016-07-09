"use strict";

export interface IStorageItem {
    /**
     * promise that states the entry is ready.
     */
    promise: Q.Promise<IStorageItem>;

    /**
     * key of the entry in the holding storage.
     */
    key: string;

    /**
     * registers event handler for close event.
     * @param handler to be called when the entry is closed.
     */
    onClose(handler: () => void): void;

    /**
     * registers event handler for error event.
     * @param handler to be called when the entry is closed.
     */
    onError(handler: (...args: any[]) => void): void;
}
