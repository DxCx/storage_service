"use strict";

import * as Q from "q";
import { EventEmitter } from "events";
import { IStorageItem } from "./Interfaces";

export abstract class StorageItem implements IStorageItem {
    private _d: Q.Deferred<StorageItem>;
    protected _ee: EventEmitter;

    constructor (protected _pee: EventEmitter, private _key: string) {
        this._d = Q.defer<StorageItem>();
        this._ee = new EventEmitter();

        // Registers on error.
        this._pee.on(`error.${this._key}`, (code: number, err: Error) => {
            this._emitError(code, err);
        });
    }

    /**
     * promise that states the entry is ready.
     */
    get promise(): Q.Promise<StorageItem> {
        return this._d.promise;
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
    public onError (handler: (code: number, err: Error) => void): void {
        this._ee.once("error", handler);
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
    protected _emitClose(): boolean {
        return this._ee.emit("close");
    }

    /**
     * emits error event which should tell callers that the object
     * has error related to it.
     * @param err object that defines the error.
     * @returns true if event was handled, false otherwise.
     */
    protected _emitError(code: number, err: Error): boolean {
        if ( true === this._d.promise.isPending() ) {
            this._d.reject(err);
            return true;
        } else {
            return this._ee.emit("error", code, err);
        }
    }

    /**
     * used to replace _d object with a new one,
     * the change will occur only after the original deferred was fired.
     * this method is helpful when changing states of the object.
     * @param d new deferred object that will be used for resolve.
     * @returns promise that will be fired only when state transaction is done.
     */
    protected _resetDeferred(d: Q.Deferred<StorageItem>): Q.Promise<StorageItem> {
        return this.promise.then((object) => {
            this._d = d;
            return d.promise;
        });
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
