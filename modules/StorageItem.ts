"use strict";

import * as Q from "q";
import { AsyncEventEmitter } from "ts-async-eventemitter";
import { IStorageItem } from "./Interfaces";

export abstract class StorageItem implements IStorageItem {
    protected _ee: AsyncEventEmitter;
    private _d: Q.Deferred<StorageItem>;
    private _promise: Promise<StorageItem>;

    constructor (protected _pee: AsyncEventEmitter, private _key: string) {
        let d = Q.defer<StorageItem>();
        this._ee = new AsyncEventEmitter();

        // Registers on error.
        _pee.on("error", (err: Error) => this._emitError(err));
        this._resetDeferred(d);
    }

    /**
     * promise that states the entry is ready.
     */
    get promise(): Promise<StorageItem> {
        return this._promise;
    }

    /**
     * is the item (or promise) pending for being created
     */
    get isPending(): boolean {
        return this._d.promise.isPending();
    }

    /**
     * key of the entry in the holding storage.
     */
    get key(): string {
        return this._key;
    }

    /**
     * registers event handler for error event.
     * @param handler to be called when the entry is closed.
     */
    public onError (handler: (err: Error) => void): void {
        this._ee.on("error", handler);
    }

    /**
     * registers event handler for close event.
     * @param handler to be called when the entry is closed.
     */
    public onClose(handler: () => void): void {
        this._ee.once("close", handler);
    }

    /**
     * emits closed event which should tell callers that the object
     * is redundant and can be removed.
     * @returns true if event was handled, false otherwise.
     */
    protected _emitClose(): Promise<void> {
        return this._ee.emitAsync<void>("close").then(() => {/*pass*/});
    }

    /**
     * emits error event which should tell callers that the object
     * has error related to it.
     * @param err object that defines the error.
     * @returns true if event was handled, false otherwise.
     */
    protected _emitError(err: Error): boolean {
        if ( true === this.isPending ) {
            this._d.reject(err);
            return true;
        } else {
            return this._ee.emit("error", err);
        }
    }

    /**
     * used to replace _d object with a new one,
     * the change will occur only after the original deferred was fired.
     * this method is helpful when changing states of the object.
     * @param d new deferred object that will be used for resolve.
     * @returns promise that will be fired only when state transaction is done.
     */
    protected _resetDeferred(d: Q.Deferred<StorageItem>): Promise<void> {
        let cb = (object: StorageItem) => {
            this._d = d;
            this._promise = new Promise<StorageItem>((resolve, reject) => {
                resolve(this._d.promise);
            });
        };

        if ( undefined === this._promise ) {
            return Promise.resolve<void>(cb(undefined));
        }
        return this._promise.then(cb);
    }

    /**
     * should be called when object is ready to use.
     * the call will trigger the promise resolution.
     */
    protected _resolved(): void {
        if ( false === this._d.promise.isPending() ) {
            return; /* Nothing to do. */
        }

        this._d.resolve(this);
    }
}
