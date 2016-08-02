"use strict";

import { ReactiveDocument, ReactiveProperty, ReactiveCollection, IReactiveError, IReactiveUpdate } from "..";
import { ReactiveEmitter } from "../modules/ReactiveEmitter";
import { AsyncEventEmitter } from "ts-async-eventemitter";
import { use as chaiUse, expect, should } from "chai";
import * as Q from "q";

type GenderType = "male" | "female";
interface IPhonebookEntry {
    key: string;
    name: string;
    age: number;
    gender: GenderType;
}

class PhonebookEntry extends ReactiveDocument {
    @ReactiveProperty()
    public name: string;

    public get age(): number {
        return this._age;
    }

    @ReactiveProperty()
    public set age(value: number) {
        this._age = value;
    }

    @ReactiveProperty()
    protected gender: GenderType;
    protected _age: number = undefined;

    constructor(pee: AsyncEventEmitter, name: string, gender: GenderType, age?: number) {
        super(pee, name);
        if ( name.length === 0 ) {
            throw new Error("name must be provided");
        }

        this.name = name;
        this.gender = gender;
        if ( undefined !== age ) {
            this._age = age;
        }
        this._resolved();
    }

    public getGender(): GenderType {
        return this.gender;
    }

    public kill(): Promise<void> {
        return this._emitDelete();
    }

    public error(e: Error): Promise<void> {
        return this._emitError(e);
    }
}

class Phonebook extends ReactiveCollection<PhonebookEntry> {
    public insert(name: string, gender: GenderType, age?: number): Promise<PhonebookEntry> {
        return this._allocateEntry(name, gender, age).then((item: PhonebookEntry) => {
            return item.promise;
        });
    }

    protected _newEntry(pee: AsyncEventEmitter, name: string, gender: GenderType, age?: number): PhonebookEntry {
        return new PhonebookEntry(pee, name, gender, age);
    }

    protected _allocateEntry(name: string, gender: GenderType, age?: number): Promise<PhonebookEntry> {
        return super._addEntry(name, gender, age);
    }
}

// Init framework.
chaiUse(require("chai-as-promised"));
should();

describe("ReactiveEmitter", () => {
    it("Should be pass sanity", (done) => {
        expect(ReactiveEmitter).to.be.a("function");
        done();
    });

    it("Should not apply as class decorator", (done) => {
        expect(() => {
            @ReactiveEmitter("test")
            class ReactiveEmitterAsClassDecorator {
                constructor() { /* Empty */ }
            }
        }).to.throw("ReactiveEmitter can be used only as property decorator");
        done();
    });

    it("Should not apply as method decorator", (done) => {
        expect(() => {
            class ReactiveEmitterAsMethodDecorator {
                constructor() { /* Empty */ }

                @ReactiveEmitter("test")
                public test(): void {
                    /* Empty */
                }
            }
        }).to.throw("ReactiveEmitter can be used only as property decorator");
        done();
    });

    it("Should not apply as parameter decorator", (done) => {
        expect(() => {
            class ReactiveEmitterAsParameterDecorator {
                constructor(@ReactiveEmitter("test") test: number) {
                    /* Empty */
                }

            }
        }).to.throw("ReactiveEmitter can be used only as property decorator");
        done();
    });

    it("Should not apply without a valid eventName", (done) => {
        expect(() => {
            class ReactiveEmitterAsParameterDecorator {
                @ReactiveEmitter(undefined)
                protected _ee: AsyncEventEmitter;

                constructor() {
                    /* Empty */
                }
            }
        }).to.throw("ReactiveEmitter must be provided with a valid event name for update");
        done();
    });

    it("Should apply as property decorator", (done) => {
        expect(() => {
            class ReactiveEmitterAsPropertyDecorator {
                @ReactiveEmitter("test")
                protected _ee: AsyncEventEmitter;

                constructor() {
                    /* Empty */
                }

            }
        }).to.not.throw(Error);
        done();
    });
});

describe("ReactiveProperty", () => {
    it("Should be pass sanity", (done) => {
        expect(ReactiveProperty).to.be.a("function");
        done();
    });

    it("Should not apply as class decorator", (done) => {
        expect(() => {
            @ReactiveProperty()
            class ReactivePropertyAsClassDecorator {
                constructor() { /* Empty */ }
            }
        }).to.throw("ReactiveProperty can be used only as property decorator");
        done();
    });

    it("Should not apply as method decorator", (done) => {
        expect(() => {
            class ReactivePropertyAsMethodDecorator {
                constructor() { /* Empty */ }

                @ReactiveProperty()
                public test(): void {
                    /* Empty */
                }
            }
        }).to.throw("ReactiveProperty can be used only as property decorator");
        done();
    });

    it("Should not apply as parameter decorator", (done) => {
        expect(() => {
            class ReactivePropertyAsParameterDecorator {
                constructor(@ReactiveProperty() test: number) {
                    /* Empty */
                }

            }
        }).to.throw("ReactiveProperty can be used only as property decorator");
        done();
    });

    it("Should not apply without ReactiveEmitter decorator", (done) => {
        expect(() => {
            class ReactivePropertyAsParameterDecorator {
                @ReactiveProperty()
                public name: string;

                constructor() {
                    /* Empty */
                }
            }
        }).to.throw("ReactiveEmitter was not applied!");
        done();
    });

    it("Should apply as property decorator", (done) => {
        expect(() => {
            class ReactivePropertyAsPropertyDecorator {
                @ReactiveEmitter("something")
                public _ee: AsyncEventEmitter;

                @ReactiveProperty()
                public name: string;

                constructor() {
                    /* Empty */
                }

            }
        }).to.not.throw(Error);
        done();
    });

    it("Should apply as property decorator - twice", (done) => {
        expect(() => {
            class ReactivePropertyAsPropertyDecorator {
                @ReactiveEmitter("somethingElse")
                public _ee: AsyncEventEmitter;

                @ReactiveProperty()
                public name: string;

                constructor() {
                    /* Empty */
                }

            }
        }).to.not.throw(Error);
        done();
    });

});

describe("ReactiveDocument", () => {
    it("Should be pass sanity", (done) => {
        expect(ReactiveDocument).to.be.a("function");
        done();
    });

    it("Should be working without ReactiveProperty", (done) => {
        expect(() => {
            class ReactiveDocumentWithoutProperty extends ReactiveDocument {
                constructor(pee: AsyncEventEmitter, key: string) {
                    super(pee, key);
                    /* Empty */
                }

            }

            let test: any = new ReactiveDocumentWithoutProperty(new AsyncEventEmitter(), "test");
            expect(test.key).be.equal("test");
        }).to.not.throw(Error);
        done();
    });

    it("Should have a working fulfilled promise", (done) => {
        class ReactiveDocumentPromiseTest extends ReactiveDocument {
            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                /* Empty */
            }

            public resolve(): void {
                this._resolved();
            }
        }

        let test: any = new ReactiveDocumentPromiseTest(new AsyncEventEmitter(), "test");

        expect(test.promise).be.instanceof(Promise);
        test.promise.should.eventually.become(test);
        test.promise.should.be.fulfilled.and.notify(done);
        test.resolve();
    });

    it("Should have a working rejected promise", (done) => {
        class ReactiveDocumentPromiseTest extends ReactiveDocument {
            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                /* Empty */
            }
        }

        let ee: AsyncEventEmitter = new AsyncEventEmitter();
        let test: any = new ReactiveDocumentPromiseTest(ee, "test");

        expect(test.promise).be.instanceof(Promise);
        test.promise.should.be.rejected.and.notify(() => {
            test.promise.then(() => {
                /* Empty */
            }, (err: Error) => {
                expect(err).to.be.an("error");
                expect(() => {
                    throw err;
                }).to.throw("Promise test rejected!");
                done();
            });
        });
        ee.emitAsync("error", new Error("Promise test rejected!")).should.be.fulfilled;
    });

    it("Should have a working internal error rejected promise", (done) => {
        class ReactiveDocumentPromiseTest extends ReactiveDocument {
            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._emitError(new Error("Promise test rejected internally!"));
            }
        }

        let ee: AsyncEventEmitter = new AsyncEventEmitter();
        let test: any = new ReactiveDocumentPromiseTest(ee, "test");

        expect(test.promise).be.instanceof(Promise);
        test.promise.should.be.rejected.and.notify(() => {
            test.promise.then(() => {
                /* Empty */
            }, (err: Error) => {
                expect(err).to.be.an("error");
                expect(() => {
                    throw err;
                }).to.throw("Promise test rejected internally!");
                done();
            });
        });
    });

    it("Should have a working onError mechanizem", (done) => {
        class ReactiveDocumentErrorTest extends ReactiveDocument {
            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._resolved();
            }
        }

        let ee: AsyncEventEmitter = new AsyncEventEmitter();
        let test: any = new ReactiveDocumentErrorTest(ee, "test");
        expect(test.onError).to.be.a("function");

        test.onError((errObject: IReactiveError) => {
            expect(errObject.key).be.equal("test");
            expect(() => {
                throw errObject.error;
            }).to.throw("onError Test!");
        });

        test.promise.should.be.fulfilled.and.notify(() => {
            return ee.emitAsync("error", new Error("onError Test!")).then(() => {
                done();
            }, (err) => {
                done(err);
            });
        });
    });

    it("Should have a working onError unsubscribe", (done) => {
        class ReactiveDocumentErrorTest extends ReactiveDocument {
            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._resolved();
            }
        }

        let ee: AsyncEventEmitter = new AsyncEventEmitter();
        let test: any = new ReactiveDocumentErrorTest(ee, "test");

        expect(test.onError).to.be.a("function");
        let unsubscribe: () => void = test.onError(() => {
            done(new Error("onError called altough it should be unsubscribed"));
        });
        unsubscribe();

        test.promise.should.be.fulfilled.and.notify(() => {
            return ee.emitAsync("error", new Error("onError Test!")).then(() => {
                done();
            }, (err) => {
                done(err);
            });
        });
    });

    it("Should have a working onUpdate mechanizem", (done) => {
        class ReactiveDocumentOnUpdateTest extends ReactiveDocument {
            @ReactiveProperty()
            public name: string;

            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._resolved();
            }
        }

        let test: any = new ReactiveDocumentOnUpdateTest(new AsyncEventEmitter(), "test");
        expect(test.onUpdate).to.be.a("function");

        test.onUpdate((updateObject: IReactiveUpdate) => {
            try {
                expect(updateObject.key).be.equal("test");
                expect(updateObject.field).be.equal("name");
                expect(updateObject.value).be.equal("newName");
            } catch (e) {
                done(e);
            }

            done();
        });

        test.promise.should.be.fulfilled.and.notify(() => {
            test.name = "newName";
        });
    });

    it("Should have a working onUpdate unsubscribe", (done) => {
        class ReactiveDocumentOnUpdateTest extends ReactiveDocument {
            @ReactiveProperty()
            public name: string;

            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._resolved();
            }
        }

        let test: any = new ReactiveDocumentOnUpdateTest(new AsyncEventEmitter(), "test");
        expect(test.onUpdate).to.be.a("function");
        let unsubscribe: () => void = test.onUpdate(() => {
            done(new Error("onUpdate called altough it should be unsubscribed"));
        });
        unsubscribe();

        test.promise.should.be.fulfilled.and.notify(() => {
            test.name = "newName";
        }).then(() => {
            done();
        }).catch((err: Error) => {
            done(err);
        });
    });

    it("Should have call onUpdate seperatly", (done) => {
        class ReactiveDocumentUpdateTest extends ReactiveDocument {
            @ReactiveProperty()
            public name: string;

            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._resolved();
            }
        }

        class ReactiveDocumentUpdateSecondTest extends ReactiveDocument {
            @ReactiveProperty()
            public something: string;

            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._resolved();
            }
        }

        let p1: Q.Deferred<void> = Q.defer<void>();
        let p2: Q.Deferred<void> = Q.defer<void>();
        let p3: Q.Deferred<void> = Q.defer<void>();
        let test: any = new ReactiveDocumentUpdateTest(new AsyncEventEmitter(), "test");
        test.onUpdate((updateObject: IReactiveUpdate) => {
            expect(updateObject.key).be.equal("test");
            expect(updateObject.field).be.equal("name");
            expect(updateObject.value).be.equal("newName");
            p1.resolve(undefined);
        });

        let test2: any = new ReactiveDocumentUpdateSecondTest(new AsyncEventEmitter(), "test2");
        test2.onUpdate((updateObject: IReactiveUpdate) => {
            expect(updateObject.key).be.equal("test2");
            expect(updateObject.field).be.equal("something");
            expect(updateObject.value).be.equal("new");
            p2.resolve(undefined);
        });

        let test3: any = new ReactiveDocumentUpdateTest(new AsyncEventEmitter(), "test3");
        test3.onUpdate((updateObject: IReactiveUpdate) => {
            expect(updateObject.key).be.equal("test3");
            expect(updateObject.field).be.equal("name");
            expect(updateObject.value).be.equal("OtherName");
            p3.resolve(undefined);
        });

        test.promise.should.be.fulfilled.and.notify(() => {
            test.name = "newName";
        });
        test2.promise.should.be.fulfilled.and.notify(() => {
            test2.something = "new";
        });
        test3.promise.should.be.fulfilled.and.notify(() => {
            test3.name = "OtherName";
        });

        Q.all([p1.promise,
               p2.promise,
               p3.promise]).then(() => {
                   done();
               }).catch((err) => {
                   done(err);
               });
    });

    it("Should have a working internal delete mechanizem", (done) => {
        class ReactiveDocumentPromiseTest extends ReactiveDocument {
            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._resolved();
            }
        }

        let p1: Q.Deferred<void> = Q.defer<void>();
        let ee: AsyncEventEmitter = new AsyncEventEmitter();
        let test: any = new ReactiveDocumentPromiseTest(ee, "testDelete");
        expect(test.onDelete).to.be.a("function");
        test.onDelete((key: string) => {
            expect(key).be.equal("testDelete");
            p1.resolve(undefined);
        });

        test.promise.should.be.fulfilled.and.notify(() => {
            return ee.emitAsync("delete").should.be.fulfilled.and.notify(() => {
                return p1.promise;
            });
        }).then(() => {
            done();
        }).catch((err: Error) => {
            done(err);
        });
    });

    it("Should have a working onDelete mechanizem", (done) => {
        class ReactiveDocumentDeleteTest extends ReactiveDocument {
            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._resolved();
            }

            public del(): Promise<void> {
                return this._emitDelete();
            }
        }

        let p1: Q.Deferred<void> = Q.defer<void>();
        let test: any = new ReactiveDocumentDeleteTest(new AsyncEventEmitter(), "testDelete");

        test.onDelete((key: string) => {
            expect(key).be.equal("testDelete");
            p1.resolve(undefined);
        });

        test.del().then(() => {
            return p1.promise;
        }).then(() => {
            done();
        }).catch((err: Error) => {
            done(err);
        });
    });

    it("Should have a working onDelete unsubscribe", (done) => {
        class ReactiveDocumentDeleteTest extends ReactiveDocument {
            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this._resolved();
            }

            public del(): Promise<void> {
                return this._emitDelete();
            }
        }

        let test: any = new ReactiveDocumentDeleteTest(new AsyncEventEmitter(), "testDelete");

        let unsubscribe: () => void = test.onDelete((key: string) => {
            done(new Error("onDelete called altough it should be unsubscribed"));
        });
        unsubscribe();

        test.del().then(() => {
            done();
        }).catch((err: Error) => {
            done(err);
        });
    });

    it("Should have a working getState (empty object)", async (done) => {
        try {
            class ReactiveDocumentWithoutProperties extends ReactiveDocument {
                constructor(pee: AsyncEventEmitter, key: string) {
                    super(pee, key);
                    this._resolved();
                }
            }

            let test: any = new ReactiveDocumentWithoutProperties(new AsyncEventEmitter(), "test");
            expect(test.getState).to.be.a("function");

            await test.promise;

            let readResult: { [key: string]: any } = test.getState();
            expect(readResult).to.be.a("object");
            expect(Object.getOwnPropertyNames(readResult).length).be.equal(1);
            expect(readResult).to.have.property("key")
            .that.is.a("string")
            .that.equals("test");

            done();
        } catch (e) {
            done(e);
        }
    });

    it("Should have a working getState", (done) => {
        class ReactiveDocumentReadTest extends ReactiveDocument {
            @ReactiveProperty()
            public foo: string;

            constructor(pee: AsyncEventEmitter, key: string) {
                super(pee, key);
                this.foo = "firstName";
                this._resolved();
            }
        }

        let test: any = new ReactiveDocumentReadTest(new AsyncEventEmitter(), "test");
        expect(test.getState).to.be.a("function");

        test.promise.then(() => {
            let readResult: { [key: string]: any } = test.getState();
            expect(readResult).to.be.a("object");
            expect(Object.getOwnPropertyNames(readResult).length).be.equal(2);
            expect(readResult).to.have.property("key")
            .that.is.a("string")
            .that.equals("test");

            expect(readResult).to.have.property("foo")
            .that.is.a("string")
            .that.equals("firstName");
            expect(test.foo).be.equal("firstName");

            test.foo = "bar";

            readResult = test.getState();
            expect(readResult).to.have.property("key")
            .that.is.a("string")
            .that.equals("test");

            expect(readResult).to.have.property("foo")
            .that.is.a("string")
            .that.equals("bar");
            expect(test.foo).be.equal("bar");

            done();
        }).catch((err: Error) => {
            done(err);
        });
    });
});

describe("ReactiveCollection", () => {
    let testPhonebook: Phonebook;
    it("Should be pass sanity", (done) => {
        expect(ReactiveCollection).to.be.a("function");
        expect(Phonebook).to.be.a("function");
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);
        done();
    });

    it("Should have a working onInsert mechanizem", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);

        let p1: Q.Deferred<void> = Q.defer<void>();
        let updates = 0;

        expect(testPhonebook.onInsert).to.be.a("function");
        testPhonebook.onInsert((item: PhonebookEntry) => {
            updates += 1;
            if ( 1 === updates ) {
                let objectState: IPhonebookEntry = item.getState() as IPhonebookEntry;
                expect(item.getGender).to.be.a("function");
                expect(objectState.key).be.equal("Arya");
                expect(objectState.gender).be.equal("female");
                expect(objectState.age).be.equal(undefined);
            } else if ( 2 === updates ) {
                let objectState: IPhonebookEntry = item.getState() as IPhonebookEntry;
                expect(item.getGender).to.be.a("function");
                expect(objectState.key).be.equal("John");
                expect(objectState.gender).be.equal("male");
                expect(objectState.age).be.equal(36);
                p1.resolve(undefined);
            }
        });

        testPhonebook.insert("", "female").should.be.rejected.and.notify(() => {
            return testPhonebook.insert("Arya", "female").then(() => {
                return testPhonebook.insert("John", "male", 36).then(() => {
                    return p1.promise;
                });
            });
        }).then(() => {
            done();
        }).catch((err) => {
            done(err);
        });
    });

    it("Should have a working onInsert unsubscribe", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);

        expect(testPhonebook.onInsert).to.be.a("function");
        let unsubscribe: () => void = testPhonebook.onInsert(() => {
            done(new Error("onInsert called altough it should be unsubscribed"));
        });
        unsubscribe();

        testPhonebook.insert("Arya", "female").then(() => {
            done();
        }).catch((err) => {
            done(err);
        });
    });

    it("Should have a working onUpdate mechanizem", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);
        let p1: Q.Deferred<void> = Q.defer<void>();

        expect(testPhonebook.onUpdate).to.be.a("function");
        testPhonebook.onUpdate((updateObject: IReactiveUpdate) => {
            try {
                expect(updateObject.key).be.equal("Tryon");
                expect(updateObject.field).be.equal("age");
                expect(updateObject.value).be.equal(30);
                p1.resolve(undefined);
            } catch (e) {
                done(e);
            }
        });

        testPhonebook.insert("Tryon", "male").then((entry: PhonebookEntry) => {
            entry.age = 30;
        }).catch((err) => {
            done(err);
        });

        p1.promise.should.be.fulfilled.and.notify(done);
    });

    it("Should have a working onUpdate unsubscribe", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);
        expect(testPhonebook.onUpdate).to.be.a("function");
        let unsubscribe: () => void = testPhonebook.onUpdate(() => {
            done(new Error("onUpdate called altough it should be unsubscribed"));
        });
        unsubscribe();

        testPhonebook.insert("Tryon", "male").then((entry: PhonebookEntry) => {
            entry.age = 30;
            done();
        }).catch((err) => {
            done(err);
        });
    });

    it("Should have a working onError mechanizem", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);
        let p1: Q.Deferred<void> = Q.defer<void>();

        expect(testPhonebook.onError).to.be.a("function");
        testPhonebook.onError((errorObject: IReactiveError) => {
            expect(errorObject.key).be.equal("Hodor");
            expect(() => {
                throw errorObject.error;
            }).to.throw("Hodor already died? :(");
            p1.resolve(undefined);
        });

        testPhonebook.insert("Hodor", "male").then((entry: PhonebookEntry) => {
            return entry.error(new Error("Hodor already died? :("));
        }).catch((err) => {
            done(err);
        });

        p1.promise.should.be.fulfilled.and.notify(done);
    });

    it("Should have a working onError unsubscribe", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);

        expect(testPhonebook.onError).to.be.a("function");
        let unsubscribe: () => void = testPhonebook.onError(() => {
            done(new Error("onError called altough it should be unsubscribed"));
        });
        unsubscribe();

        testPhonebook.insert("Hodor", "male").then((entry: PhonebookEntry) => {
            return entry.error(new Error("Hodor already died? :("));
        }).then(() => {
            done();
        }).catch((err) => {
            done(err);
        });
    });

    it("Should have a working onDelete mechanizem", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);
        let p1: Q.Deferred<void> = Q.defer<void>();

        expect(testPhonebook.onDelete).to.be.a("function");
        testPhonebook.onDelete((key: string) => {
            expect(key).be.equal("Hodor");
            p1.resolve(undefined);
        });

        testPhonebook.insert("Hodor", "male").then((entry: PhonebookEntry) => {
            return entry.kill();
        }).catch((err) => {
            done(err);
        });

        p1.promise.should.be.fulfilled.and.notify(done);
    });

    it("Should have a working onDispose mechanizem", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);
        let p1: Q.Deferred<void> = Q.defer<void>();

        expect(testPhonebook.onDispose).to.be.a("function");
        testPhonebook.onDispose(() => {
            p1.resolve(undefined);
        });

        return testPhonebook.dispose().then(() => {
            return p1.promise;
        }).then(() => {
            done();
        }, (err: Error) => {
            done(err);
        });
    });

    it("Should have a working onDelete unsubscribe", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);

        expect(testPhonebook.onDelete).to.be.a("function");
        let unsubscribe: () => void = testPhonebook.onDelete(() => {
            done(new Error("onDelete called altough it should be unsubscribed"));
        });
        unsubscribe();

        testPhonebook.insert("Hodor", "male").then((entry: PhonebookEntry) => {
            return entry.kill();
        }).then(() => {
            done();
        }).catch((err) => {
            done(err);
        });
    });

    it("Should have a working getState()", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);
        let p1: Q.Deferred<void> = Q.defer<void>();

        expect(testPhonebook.getState).to.be.a("function");
        testPhonebook.insert("Ned", "male").then((ned: PhonebookEntry) => {
            return testPhonebook.insert("Katlin", "female").then((katlin: PhonebookEntry) => {
                return testPhonebook.insert("Rob", "male").then((rob: PhonebookEntry) => {
                    return rob.kill().then(() => {
                        let readResults: { [key: string]: { [key: string]: any } } = testPhonebook.getState();

                        expect(Object.keys(readResults).length).to.be.equal(2);
                        expect(readResults[ned.key]).to.have.property("key")
                            .that.is.a("string")
                            .that.equals("Ned");
                        expect(readResults[ned.key]).to.have.property("gender")
                            .that.is.a("string")
                            .that.equals("male");

                        expect(readResults[katlin.key]).to.have.property("key")
                            .that.is.a("string")
                            .that.equals("Katlin");
                        expect(readResults[katlin.key]).to.have.property("gender")
                            .that.is.a("string")
                            .that.equals("female");
                        p1.resolve(undefined);
                    });
                });
            });
        }).catch((err) => {
            done(err);
        });

        p1.promise.should.be.fulfilled.and.notify(done);
    });

    it("Should have a working hasEntry mechanizem", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);
        let p1: Q.Deferred<void> = Q.defer<void>();

        expect(testPhonebook.hasEntry).to.be.a("function");
        testPhonebook.insert("Ned", "male").then((ned: PhonebookEntry) => {
            return testPhonebook.insert("Katlin", "female").then((katlin: PhonebookEntry) => {
                return testPhonebook.insert("Rob", "male").then((rob: PhonebookEntry) => {
                    return rob.kill().then(() => {
                        return Q.all([
                            testPhonebook.hasEntry("Rob").should.be.rejected,
                            testPhonebook.hasEntry("Ned").should.be.fulfilled,
                            testPhonebook.hasEntry("Katlin").should.be.fulfilled,
                        ]).then(() => p1.resolve(undefined));
                    });
                });
            });
        }).catch((err) => {
            done(err);
        });

        p1.promise.should.be.fulfilled.and.notify(done);
    });

    it("Should have a working getEntry mechanizem", (done) => {
        expect(() => {
            testPhonebook = new Phonebook();
        }).to.not.throw(Error);
        let p1: Q.Deferred<void> = Q.defer<void>();

        expect(testPhonebook.getEntry).to.be.a("function");
        testPhonebook.insert("Ned", "male").then((ned: PhonebookEntry) => {
            return testPhonebook.insert("Katlin", "female").then((katlin: PhonebookEntry) => {
                return testPhonebook.insert("Rob", "male").then((rob: PhonebookEntry) => {
                    return rob.kill().then(() => {
                        return Q.all([
                            testPhonebook.getEntry("Rob").should.be.rejected,
                            testPhonebook.getEntry("Ned").should.be.fulfilled,
                            testPhonebook.getEntry("Katlin").should.be.fulfilled,
                        ]).then(() => p1.resolve(undefined));
                    });
                });
            });
        }).catch((err) => {
            done(err);
        });

        p1.promise.should.be.fulfilled.and.notify(done);
    });
});
