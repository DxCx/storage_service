"use strict";

import { AsyncEventEmitter } from "ts-async-eventemitter";
import { IStorageItem } from "./Interfaces";

interface IDBEntry<T> {
    item: T;
    ee: AsyncEventEmitter;
}

/**
 * Base class used for storing information.
 */
export abstract class StorageService<T extends IStorageItem> {
    protected _ee: AsyncEventEmitter;
    private _db: Array<IDBEntry<T>>;

    constructor() {
        this._db = new Array<IDBEntry<T>>();
        this._ee = new AsyncEventEmitter();
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
     * Registers handler for item added to storage event.
     * @param handler to be called when new item is added.
     */
    public onAdded(handler: (entry: T) => void): void {
        this._ee.on("added", handler);
    }

    /**
     * Registers handler for item removed from storage event.
     * @param handler to be called when item is removed.
     */
    public onRemoved(handler: (entry: T) => void): void {
        this._ee.on("removed", handler);
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
            let o: IDBEntry<T> = {
                ee: ee,
                item: this._newEntry(ee, key, ...creationArgs),
            };
            this._db[key] = o;
            o.item.promise.then(() => {
                o.item.onClose(() => {
                    delete this._db[key];
                    return this._ee.emitAsync<void>("removed", o.item).then(() => {/*ignore*/});
                });

                return this._ee.emitAsync<void>("added", o.item);
            }, (errObj: Error) => {
                delete this._db[key];
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
}
