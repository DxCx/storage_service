"use strict";

import { EventEmitter } from "events";
import { IStorageItem } from "./Interfaces";
import * as Q from "q";

/**
 * Base class used for storing information.
 */
export abstract class StorageService<T extends IStorageItem> {
    private _db: Array<T>;
    protected _ee: EventEmitter;

    constructor() {
        this._db = new Array<T>();
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
        return this.hasEntry(key).then((exists) => {
            return this._db[key];
        });
    }

    /**
     * Generator method to go over all items in storage
     */
    public *items(): Iterable<T> {
        for ( let key in this._db ) {
            if ( this._db.hasOwnProperty(key) ) {
                yield this._db[key];
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
    protected abstract _allocateEntry(...args: any[]): Q.Promise<T>;

    /**
     * Allocates and adds a new entry to the storage.
     * the entry will be automatically removed once its redundant.
     * NOTE: signature should be overloaded to match constructor arguments.
     *
     * @param key the key to be used for the new entry.
     * @param args arguments for the entry constructor. (shoulld be same _newEntry)
     * @returns promise to be resolved once object is usable.
     */
    protected _addEntry(key: string, ...args: any[]): Q.Promise<T> {
        return this.hasEntry(key).then<T>((exists) => {
            // If entry exists, throw error.
            if (true === exists ) { // Dummy, will always get in.
                throw new Error(`Entry ${key} already exists`);
            }
            return undefined;
        }, (err) => {
            // Entry does not exists, fix promise chain by returning a promise.
            let o: T = this._newEntry(...args);
            let doneCb = () => {
                delete this._db[key];
                this._ee.emit("removed", o);
            };

            this._db[key] = o;
            this._ee.emit("added", o);
            o.onClose(doneCb);
            o.promise.catch((objErr: any) => {
                doneCb();
                throw objErr;
            });
            return o;
        });
    }

    /**
     * Abstract method used to allocate a new entry
     * NOTE: should return the result of new operator
     */
    protected abstract _newEntry(...args: any[]): T;
}
