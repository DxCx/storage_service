"use strict";

import { AsyncEventEmitter } from "ts-async-eventemitter";
import { IReactiveDocument, IReactiveCollection, IReactiveUpdate, IReactiveError } from "./Interfaces";

interface IDBEntry<T> {
    item: T;
    ee: AsyncEventEmitter;
}

/**
 * Base class used for storing information.
 */
export abstract class ReactiveCollection<T extends IReactiveDocument> implements IReactiveCollection<T> {
    protected _ee: AsyncEventEmitter;
    private _db: Array<IDBEntry<T>>;

    constructor() {
        this._db = new Array<IDBEntry<T>>();
        this._ee = new AsyncEventEmitter();
    }

    /**
     * @returns an array of dictionary representation of the documents.
     */
    public read(): { [key: string]: { [key: string]: any } } {
        let results: { [key: string]: { [key: string]: any } } = {};

        for ( let doc of this.items() ) {
            results[doc.key] = doc.read();
        }

        return results;
    }

    /**
     * The method is used to search for specific key in storage.
     * @param key to search
     * @returns promise that will resolve if key exists in storage, reject otherwise.
     */
    public hasEntry(key: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (true === this._db.hasOwnProperty(key)) {
                resolve(undefined);
            } else {
                reject(new Error(`key ${key} was not found in storage.`));
            }
        });
    }

    /**
     * The method is used to query an entry by key.
     * @param key to search
     * @returns required entry, will be rejected if entry not found.
     */
    public getEntry(key: string): Promise<T> {
        return this._getEntry(key).then((e: IDBEntry<T>): T => {
            return e.item;
        });
    }

    /**
     * Generator method to go over all items in storage
     */
    public *items(): Iterable<T> {
        for ( let key in this._db ) {
            if ( this._db.hasOwnProperty(key) ) {
                yield this._db[key].item;
            }
        }
    }

    /**
     * registers event handler for insert event.
     * @param handler to be called when the entry is created.
     * @returns function to remove subscription.
     */
    public onInsert(handler: (newItem: { [key: string]: any }) => void | Promise<void>): () => void {
        return this._registerEvent("insert", handler);
    }

    /**
     * registers event handler for update event.
     * @param handler to be called when the entry is updated.
     * @returns function to remove subscription.
     */
    public onUpdate(handler: (updateInfo: IReactiveUpdate) => void | Promise<void>): () => void {
        return this._registerEvent("update", handler);
    }

    /**
     * registers event handler for error event.
     * @param handler to be called when the entry is closed.
     * @returns function to remove subscription.
     */
    public onError(handler: (errorInfo: IReactiveError) => void | Promise<void>): () => void {
        return this._registerEvent("error", handler);
    }

    /**
     * registers event handler for deleted event.
     * @param handler to be called when the entry is deleted.
     * @returns function to remove subscription.
     */
    public onDelete(handler: (key: string) => void | Promise<void>): () => void {
        return this._registerEvent("delete", handler);
    }

    /**
     * Allocates and adds a new entry to the storage.
     * this should be a wrapper function to call super._addEntry.
     * NOTE: signature should be overloaded to match required arguments.
     *
     * @returns promise to be resolved once object is usable.
     */
    protected abstract _allocateEntry(key: string, ...creationArgs: any[]): Promise<T>;

    /**
     * Abstract method used to allocate a new entry
     * NOTE: should return the result of new operator
     */
    protected abstract _newEntry(pee: AsyncEventEmitter, key: string, ...creationArgs: any[]): T;

    /**
     * Allocates and adds a new entry to the storage.
     * the entry will be automatically removed once its redundant.
     * NOTE: signature should be overloaded to match constructor arguments.
     *
     * @param key the key to be used for the new entry.
     * @param creationArgs arguments for the entry constructor. (shoulld be same _newEntry)
     * @returns promise to be resolved once object is usable.
     */
    protected _addEntry(key: string, ...creationArgs: any[]): Promise<T> {
        return this.hasEntry(key).then<T>((): T => {
            throw new Error(`Entry ${key} already exists`);
        }, (err) => {
            // Entry does not exists, fix promise chain by returning a promise.
            let ee: AsyncEventEmitter = new AsyncEventEmitter();
            let isItemResolved: boolean = false;
            let o: IDBEntry<T> = {
                ee: ee,
                item: this._newEntry(ee, key, ...creationArgs),
            };
            this._db[key] = o;
            let doneCb = () => {
                delete this._db[key];
                if ( true === isItemResolved ) {
                    return this._ee.emitAsync<void>("delete", o.item.key).then(() => {/*ignore*/});
                }
            };

            o.item.onError((errObject: IReactiveError) => {
                o.item.promise.then(() => {
                    return this._ee.emitAsync<void>("error", errObject).then(() => {/*ignore*/});
                });
            });
            o.item.onUpdate((updateObject: IReactiveUpdate) => {
                o.item.promise.then(() => {
                    return this._ee.emitAsync<void>("update", updateObject).then(() => {/*ignore*/});
                });
            });

            o.item.promise.then(() => {
                isItemResolved = true;
                o.item.onDelete(doneCb);
                return this._ee.emitAsync<void>("insert", o.item.read());
            }, (errObj: Error) => {
                doneCb();
                throw errObj;
            });

            return o.item;
        });
    }

    /**
     * utility method used to communicate with each item.
     *
     * @param key the database entry you want to communicate with.
     * @param eventName the name of event you want to emit.
     * @param eventArgs arguments to pass along with the event.
     * @returns promise that resolves once the event
     * is emitted indicating if the event was handled or not.
     */
    protected _emitEntry<U>(key: string, eventName: string, ...eventArgs: any[]): Promise<U[]> {
        return this._getEntry(key).then((entry: IDBEntry<T>) => {
            return entry.ee.emitAsync<U>(eventName, ...eventArgs);
        });
    }

    /**
     * utility method used to send errors to entry items.
     *
     * @param key the database entry you want to communicate with.
     * @param err error object to send.
     * @returns promise that resolves once the event
     * is emitted indicating if the event was handled or not.
     */
    protected _emitEntryError(key: string, err: Error) {
        return this._emitEntry(key, "error", err);
    }

    /**
     * utility method used to forcefuly get entry,
     * if the entry exists, it will return it,
     * if the entry is missing, it will allocate it.
     *
     * @param key the key to be used for the new entry.
     * @param creationArgs arguments for the entry constructor. (shoulld be same _newEntry)
     * @returns promise that resolves to the requested entry.
     */
    protected _resolveEntry(key: string, ...creationArgs: any[]): Promise<T> {
        return this.getEntry(key).then((e: T): T => {
            return e;
        }, (err) => {
            return this._allocateEntry(key, ...creationArgs);
        });
    }

    /**
     * The method is used to query an entry by key.
     * @param key to search
     * @returns required Idbentry, will be rejected if entry not found.
     */
    private _getEntry(key: string): Promise<IDBEntry<T>> {
        return this.hasEntry(key).then((): IDBEntry<T> => {
            return this._db[key];
        });
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
            this._ee.removeListener(eventName, handler);
        };
    }
}
