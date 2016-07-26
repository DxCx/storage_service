"use strict";

import "reflect-metadata";
import { AsyncEventEmitter } from "ts-async-eventemitter";

export function ReactiveEmitter(updateEventName: string): any {
    return function (target: any, propertyKey: string, value?: any) {
        let descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
        let originalDescriptor: PropertyDescriptor = descriptor;
        descriptor = (undefined !== descriptor) ? descriptor : <PropertyDescriptor> {};

        if ( true === Reflect.hasMetadata("rd:ReactiveEmitterApplied", target) ) {
            throw new Error("ReactiveEmitter is already applied!");
        }

        if ( undefined === value ) {
            descriptor.value = new AsyncEventEmitter();
        } else {
            descriptor.value = value;
        }

        Reflect.defineMetadata("rd:ReactiveEmitterApplied", propertyKey, target);
        Reflect.defineMetadata("rd:ReactiveEventName", updateEventName, target);
        Reflect.defineMetadata("rd:reactiveKeys", new Array<string>(), target);

        if ( undefined === originalDescriptor ) {
            Object.defineProperty(target, propertyKey, descriptor);
            return;
        } else {
            return descriptor;
        }
    };
}

export function getReactiveEmitter(target: Object): AsyncEventEmitter {
    let proto: any = Object.getPrototypeOf(target);

    if ( false === Reflect.hasMetadata("rd:ReactiveEmitterApplied", proto) ) {
        throw new Error("ReactiveEmitter is not applied in class!");
    }

    return target[Reflect.getMetadata("rd:ReactiveEmitterApplied", proto)];
}
