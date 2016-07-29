"use strict";

import "reflect-metadata";
import { AsyncEventEmitter } from "ts-async-eventemitter";
import { IReactiveUpdate } from "./Interfaces";
import { getReactiveEmitter } from "./ReactiveEmitter";

const RP_KEY: string = "_REACTIVE_PROPERTIES";

export function ReactiveProperty(): any {
    return function (target: any, propertyKey: string, value?: any) {
        if ( (undefined === propertyKey) ||
             ((undefined !== value) &&
              ((typeof value === "number") ||
              (typeof value.value === "function"))) ) {
            throw new Error("ReactiveProperty can be used only as property decorator");
        }

        let emitterName: string = Reflect.getMetadata("rd:ReactiveEmitterApplied", target);
        if ( undefined === emitterName  ) {
            throw new Error("ReactiveEmitter was not applied!");
        }
        let reactiveKeys: Array<string> = Reflect.getMetadata(`rd:reactiveKeys:${target.constructor.name}`, target);
        if ( undefined === reactiveKeys ) {
            reactiveKeys = new Array<string>();
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
            originalGet = function (): any {
                if ( undefined === this[RP_KEY] ) {
                    this[RP_KEY] = new Array();
                    return undefined;
                }

                return this[RP_KEY][propertyKey];
            };
        }

        if ( undefined === originalSet ) {
            originalSet = function (newValue: any): void {
                if ( undefined === this.hasOwnProperty(RP_KEY) ) {
                    this[RP_KEY] = new Array();
                }

                this[RP_KEY][propertyKey] = newValue;
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
        Reflect.defineMetadata(`rd:reactiveKeys:${target.constructor.name}`, reactiveKeys, target);
        if ( undefined === Object.getOwnPropertyDescriptor(target, RP_KEY) ) {
            Object.defineProperty(target, RP_KEY, {
                configurable: false,
                enumerable: false,
                value: undefined,
                writable: true,
            });
        }

        if ( undefined === originalDescriptor ) {
            Object.defineProperty(target, propertyKey, descriptor);
            return;
        } else {
            return descriptor;
        }
    };
}
