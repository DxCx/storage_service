"use strict";

import "reflect-metadata";
import { AsyncEventEmitter } from "ts-async-eventemitter";
import { IReactiveUpdate } from "./Interfaces";
import { getReactiveEmitter } from "./ReactiveEmitter";

export function ReactiveProperty(): any {
    return function (target: any, propertyKey: string, value?: any) {
        let emitterName: string = Reflect.getMetadata("rd:ReactiveEmitterApplied", target);
        if ( undefined === emitterName  ) {
            throw new Error("ReactiveEmitter was not applied!");
        }
        let reactiveKeys: Array<string> = Reflect.getMetadata("rd:reactiveKeys", target);
        if ( undefined === reactiveKeys ) {
            throw new Error("Reactive Property must be used on a ReactiveDocument");
        }

        let descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
        let originalDescriptor: PropertyDescriptor = descriptor;
        descriptor = (undefined !== descriptor) ? descriptor : <PropertyDescriptor> {};
        let originalGet: Function = descriptor.get;
        let originalSet: Function = descriptor.set;

        if ( (undefined === originalSet) && (undefined !== originalGet) ) {
            throw new Error("Either set a setter and a getter, but not just a getter");
        }

        if ( undefined === originalGet ) {
            originalGet = (): any => {
                return descriptor.value;
            };
        }

        if ( undefined === originalSet ) {
            originalSet = (newValue: any): void => {
                descriptor.value = newValue;
            };
        }

        descriptor.get = function () {
            return originalGet.apply(this);
        };

        descriptor.set = function (newValue: any) {
            let originalValue = originalGet.apply(this);
            if ( newValue === originalValue ) {
                return;
            }

            let ee: AsyncEventEmitter = getReactiveEmitter(this);
            let updateEventName: string = Reflect.getMetadata("rd:ReactiveEventName", target);

            originalSet.call(this, newValue);
            ee.emitAsync(updateEventName, <IReactiveUpdate> {
                field: propertyKey,
                key: this._key,
                value: newValue});
        };
        descriptor.enumerable = true;
        descriptor.configurable = false;

        reactiveKeys.push(propertyKey);
        Reflect.defineMetadata("rd:reactiveKeys", reactiveKeys, target);
        if ( undefined === originalDescriptor ) {
            Object.defineProperty(target, propertyKey, descriptor);
            return;
        } else {
            return descriptor;
        }
    };
}
