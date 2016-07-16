"use strict";

export interface IStorageItem {
    /**
     * promise that states the entry is ready.
     */
    promise: Promise<IStorageItem>;

    /**
     * key of the entry in the holding storage.
     */
    key: string;

    /**
     * is the item (or promise) pending for being created
     */
    isPending: boolean;

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
