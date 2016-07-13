"use strict";

import { EventEmitter } from "events";
import { IStorageItem } from "./Interfaces";
import * as Q from "q";

interface IDBEntry<T> {
    item: T;
    ee: EventEmitter;
}

/**
 * Base class used for storing information.
 */
export abstract class StorageService<T extends IStorageItem> {
    protected _ee: EventEmitter;
    private _db: Array<IDBEntry<T>>;

    constructor() {
        this._db = new Array<IDBEntry<T>>();
        this._ee = new EventEmitter();
    }

    /**
     * The method is used to search for specific key in storage.
     * @param key to search
     * @returns promise that will return true if key exists in storage, reject otherwise.
     */
    public hasEntry(key: string): Q.Promise<boolean> {
        return Q.Promise<boolean>((resolve, reject) => {
            if (key in this._db) {
                resolve(true);
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
    public getEntry(key: string): Q.Promise<T> {
        return this._getEntry(key).then((e: IDBEntry<T>) => {
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
    protected abstract _allocateEntry(key: string, ...creationArgs: any[]): Q.Promise<T>;

    /**
     * Abstract method used to allocate a new entry
     * NOTE: should return the result of new operator
     */
    protected abstract _newEntry(pee: EventEmitter, key: string, ...creationArgs: any[]): T;

    /**
     * Allocates and adds a new entry to the storage.
     * the entry will be automatically removed once its redundant.
     * NOTE: signature should be overloaded to match constructor arguments.
     *
     * @param key the key to be used for the new entry.
     * @param creationArgs arguments for the entry constructor. (shoulld be same _newEntry)
     * @returns promise to be resolved once object is usable.
     */
    protected _addEntry(key: string, ...creationArgs: any[]): Q.Promise<T> {
        return this.hasEntry(key).then<T>((exists) => {
            // If entry exists, throw error.
            if (true === exists ) { // Dummy, will always get in.
                throw new Error(`Entry ${key} already exists`);
            }
            return undefined;
        }, (err) => {
            // Entry does not exists, fix promise chain by returning a promise.
            let ee: EventEmitter = new EventEmitter();
            let o: IDBEntry<T> = {
                ee: ee,
                item: this._newEntry(ee, key, ...creationArgs),
            };
            let doneCb = () => {
                delete this._db[key];
                this._ee.emit("removed", o.item);
            };

            this._db[key] = o;
            this._ee.emit("added", o.item);
            o.item.onClose(doneCb);
            o.item.promise.catch((objErr: any) => {
                doneCb();
                throw objErr;
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
    protected _emitEntry(key: string, eventName: string, ...eventArgs: any[]): Q.Promise<boolean> {
        return this._getEntry(key).then((e: IDBEntry<T>) => {
            return e.ee.emit(eventName, ...eventArgs);
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
    protected _resolveEntry(key: string, ...creationArgs: any[]) {
        return this.getEntry(key).then((e: T) => {
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
    private _getEntry(key: string): Q.Promise<IDBEntry<T>> {
        return this.hasEntry(key).then((exists) => {
            return this._db[key];
        });
    }
}
