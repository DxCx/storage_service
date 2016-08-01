"use strict";

export interface IReactiveCollection<T> {
    /**
     * @returns an dict (key = item.key: item) of dictionary representation of the documents.
     */
    getState(): { [key: string]: { [key: string]: any } };

    /**
     * The method is used to dispose the collection.
     * @returns promise that will resolve once the object can be deleted
     */
    dispose(): Promise<void>;

    /**
     * registers event handler for insert event.
     * @param handler to be called when the entry is created.
     * @returns function to remove subscription.
     */
    onInsert(handler: (newItem: { [key: string]: any }) => void | Promise<void>): () => void;

    /**
     * registers event handler for update event.
     * @param handler to be called when the entry is updated.
     * @returns function to remove subscription.
     */
    onUpdate(handler: (updateInfo: IReactiveUpdate) => void | Promise<void>): () => void;

    /**
     * registers event handler for error event.
     * @param handler to be called when the entry is closed.
     * @returns function to remove subscription.
     */
    onError(handler: (errorInfo: IReactiveError) => void | Promise<void>): () => void;

    /**
     * registers event handler for deleted event.
     * @param handler to be called when the entry is deleted.
     * @returns function to remove subscription.
     */
    onDelete(handler: (key: string) => void | Promise<void>): () => void;

    /**
     * registers event handler for dispose event. (collection is deleted)
     * @param handler to be called when the entry is deleted.
     * @returns function to remove subscription.
     */
    onDispose(handler: () => void | Promise<void>): () => void;

    /**
     * The method is used to search for specific key in storage.
     * @param key to search
     * @returns promise that will resolve if key exists in storage, reject otherwise.
     */
    hasEntry(key: string): Promise<void>;

    /**
     * The method is used to query an entry by key.
     * @param key to search
     * @returns required entry, will be rejected if entry not found.
     */
    getEntry(key: string): Promise<T>;
}

export interface IReactiveUpdate {
    /**
     * key of the entry in the holding document.
     */
    key: string;

    /**
     * field name that was updated
     */
    field: string;

    /**
     * new value of the field
     */
    value: any;
}

export interface IReactiveError {
    /**
     * key of the entry in the holding document.
     */
    key: string;

    /**
     * error object of the failure.
     */
    error: Error;
}

export interface IReactiveDocument {
    /**
     * promise that states the entry is ready.
     */
    promise: Promise<IReactiveDocument>;

    /**
     * key of the entry in the holding document.
     */
    key: string;

    /**
     * is the item (or promise) pending for being created
     */
    isPending: boolean;

    /**
     * @returns dictionary representation of the document.
     */
    getState(): { [key: string]: any };

    /**
     * registers event handler for update event.
     * @param handler to be called when the entry is updated.
     * @returns function to remove subscription.
     */
    onUpdate(handler: (updateInfo: IReactiveUpdate) => void | Promise<void>): () => void;

    /**
     * registers event handler for error event.
     * @param handler to be called when the entry is closed.
     * @returns function to remove subscription.
     */
    onError(handler: (errorInfo: IReactiveError) => void | Promise<void>): () => void;

    /**
     * registers event handler for deleted event.
     * @param handler to be called when the entry is deleted.
     * @returns function to remove subscription.
     */
    onDelete(handler: (key: string) => void | Promise<void>): () => void;
}
