"use strict";

import "reflect-metadata";
import { AsyncEventEmitter } from "ts-async-eventemitter";

export function ReactiveEmitter(updateEventName: string): any {
    if ( undefined === updateEventName ) {
        throw new Error("ReactiveEmitter must be provided with a valid event name for update");
    }

    return function (target: any, propertyKey: string, value?: any) {
        if ( (undefined === propertyKey) ||
             ((undefined !== value) &&
              ((typeof value === "number") ||
              (typeof value.value === "function"))) ) {
            throw new Error("ReactiveEmitter can be used only as property decorator");
        }

        if ( true === Reflect.hasMetadata("rd:ReactiveEmitterApplied", target) ) {
            throw new Error("ReactiveEmitter is already applied!");
        }

        // TODO: Is there a way to construct the event emitter for each
        // object that will be generated in the future?
        // if i try to set a DataDescriptor it acts like static :(

        Reflect.defineMetadata("rd:ReactiveEmitterApplied", propertyKey, target);
        Reflect.defineMetadata("rd:ReactiveEventName", updateEventName, target);
    };
}

export function getReactiveEmitter(target: Object): AsyncEventEmitter {
    let proto: any = Object.getPrototypeOf(target);

    if ( false === Reflect.hasMetadata("rd:ReactiveEmitterApplied", proto) ) {
        throw new Error("ReactiveEmitter is not applied in class!");
    }

    return target[Reflect.getMetadata("rd:ReactiveEmitterApplied", proto)];
}
