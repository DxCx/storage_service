"use strict";

import * as Q from "q";
import { AsyncEventEmitter } from "ts-async-eventemitter";
import { IReactiveDocument, IReactiveUpdate, IReactiveError } from "./Interfaces";
import { ReactiveEmitter } from "./ReactiveEmitter";

export abstract class ReactiveDocument implements IReactiveDocument {
    @ReactiveEmitter("update")
    protected _ee: AsyncEventEmitter;
    private _d: Q.Deferred<ReactiveDocument>;
    private _promise: Promise<ReactiveDocument>;

    constructor (protected _pee: AsyncEventEmitter, private _key: string) {
        let d = Q.defer<ReactiveDocument>();
        this._ee = new AsyncEventEmitter();

        // Registers on error.
        _pee.on("error", (err: Error) => this._emitError(err));
        _pee.on("delete", (err: Error) => this._emitDelete());
        this._resetDeferred(d);
    }

    /**
     * promise that states the entry is ready.
     */
    public get promise(): Promise<ReactiveDocument> {
        return this._promise;
    }

    /**
     * is the item (or promise) pending for being created
     */
    public get isPending(): boolean {
        return this._d.promise.isPending();
    }

    /**
     * key of the entry in the holding storage.
     */
    public get key(): string {
        return this._key;
    }

    /**
     * @returns dictionary representation of the document.
     */
    public getState(): { [key: string]: any } {
        let className: string = Object.getPrototypeOf(this).constructor.name;
        let reactiveKeysKey: string = `rd:reactiveKeys:${className}`;
        let reactiveKeys: Array<string> = Reflect.getMetadata(reactiveKeysKey, Object.getPrototypeOf(this));
        let ret: { [key: string]: any } = {
            "key": this.key,
        };
        if ( undefined !== reactiveKeys ) {
            Object.assign(ret, ...reactiveKeys.map((key: string) => {
                return { [key]: this[key] };
            }));
        }

        return ret;
    }

    /**
     * registers event handler for update event.
     * @param handler to be called when the entry is updated.
     */
    public onUpdate(handler: (updateInfo: IReactiveUpdate) => void | Promise<void>): () => void {
        return this._registerEvent("update", handler);
    }

    /**
     * registers event handler for error event.
     * @param handler to be called when the entry is closed.
     */
    public onError(handler: (errorInfo: IReactiveError) => void | Promise<void>): () => void {
        return this._registerEvent("error", handler);
    }

    /**
     * registers event handler for deleted event.
     * @param handler to be called when the entry is deleted.
     */
    public onDelete(handler: (key: string) => void | Promise<void>): () => void {
        return this._registerEvent("delete", handler);
    }

    /**
     * emits closed event which should tell callers that the object
     * is redundant and can be removed.
     * @returns true if event was handled, false otherwise.
     */
    protected _emitDelete(): Promise<void> {
        return this._ee.emitAsync<void>("delete", this.key).then(() => {
            this._ee.removeAllListeners();
        });
    }

    /**
     * emits error event which should tell callers that the object
     * has error related to it.
     * @param err object that defines the error.
     * @returns true if event was handled, false otherwise.
     */
    protected _emitError(err: Error): Promise<void> {
        if ( true === this.isPending ) {
            this._d.reject(err);
            return this._emitDelete();
        } else {
            return this._ee.emitAsync("error", <IReactiveError> {
                error: err,
                key: this.key,
            }).then(() => {/*ignore*/});
        }
    }

    /**
     * used to replace _d object with a new one,
     * the change will occur only after the original deferred was fired.
     * this method is helpful when changing states of the object.
     * @param d new deferred object that will be used for resolve.
     * @returns promise that will be fired only when state transaction is done.
     */
    protected _resetDeferred(d: Q.Deferred<ReactiveDocument>): Promise<void> {
        let cb = (object: ReactiveDocument) => {
            this._d = d;
            this._promise = new Promise<ReactiveDocument>((resolve, reject) => {
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

    /**
     * The method is used to register event on the event emitter
     * and return a function to unsubscribe it.
     * @param eventName event to register on
     * @param handler handler to call when event triggers
     * @returns unsubscribe function to call when done
     */
    private _registerEvent<T>(eventName: string, handler: (...args: any[]) => T | Promise<T>): () => void {
        this._ee.on(eventName, handler);
        return () => {
            if ( undefined !== this._ee ) {
                this._ee.removeListener(eventName, handler);
            }
        };
    }
}
