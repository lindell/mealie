import { Ref } from "@nuxtjs/composition-api";

export interface CacheInterface<T> {
    set(data: T): void
    setMultiple(datas: T[]): void
    get(key: string): Promise<T | undefined>
    getAll(): Promise<T[] | undefined>
    fillRef(ref: Ref<T | null>, key: string): Promise<void>
    fillAllRef(ref: Ref<T[] | null> | null): Promise<void>
}

/** Basic caching implementation using IndexDB. Allows for caching on individual types and on all types. */
export class Cache<T> {
    private static versionResolve: (x: number) => void;
    private static version = new Promise<number>(resolve => {
        Cache.versionResolve = resolve;
    });

    private db: IDBDatabase | undefined;

    constructor(readonly name: string, readonly key: keyof T & string) {
        Cache.version.then(version => {
            const request = indexedDB.open(this.name, version);
            request.onsuccess = () => {
                this.db = request.result;
            }
            request.onupgradeneeded = () => {
                if (request.result.objectStoreNames.contains(this.name)) {
                    request.result.deleteObjectStore(this.name);
                }
                request.result.createObjectStore(this.name, { keyPath: this.key })

                this.db = request.result;
            };
        });
    }

    static setVersion(version: number) {
        this.versionResolve(version);
    }

    private store(readonly?: boolean) {
        return this.db?.transaction(this.name, readonly ? "readonly" : "readwrite").objectStore(this.name);
    }

    set(data: T) {
        const store = this.store();
        if (!store) return;
        store.add(data);
    }

    setMultiple(datas: T[]) {
        const store = this.store();
        if (!store) return;

        console.time();
        for (const data of datas) {
            store.add(data);
        }
        console.timeEnd();
    }

    async get(key: string): Promise<T | undefined> {
        const store = this.store();
        if (!store) return;
        console.log(this.name, key);

        const request: IDBRequest<T> = store.get(key);
        return await requestWait(request);
    }

    async getAll(): Promise<T[] | undefined> {
        const store = this.store();
        if (!store) return;

        const request: IDBRequest<T[]> = store.getAll();
        return await requestWait(request);
    }

    /** Fill a ref with a cached value IF the value exist, and the ref is not already set */
    async fillRef(ref: Ref<T | null>, key: string) {
        if (ref.value !== null) return;
        const cachedValue = await this.get(key);
        if (cachedValue && !ref.value) {
            ref.value = cachedValue;
        }
    }

    /** Fill a ref with all cached values IF the ref is not already set */
    async fillAllRef(ref: Ref<T[] | null> | null) {
        console.log({ ref });
        if (!ref || ref.value !== null) return;
        console.log("Trying");
        const cachedValue = await this.getAll();
        console.log({ cachedValue });
        if (cachedValue && !ref.value) {
            ref.value = cachedValue;
        }
    }
}

interface MultiCacheValue<T> {
    key: "key",
    data: T[],
}

/**
 * Cache that only supports caching all values of a type. 
 * It does store all values in one singel indexDB entry.
 * This does not allow the cache to fetch/store individual entries, but is faster with a lot of entries.
 */
export class MultiCache<T> {
    private singleCache: Cache<MultiCacheValue<T>>;
    constructor(readonly name: string) {
        this.singleCache = new Cache(name, "key");
    }

    set(_: T) { return undefined; }
    get(_: string): Promise<T | undefined> { return Promise.resolve(undefined) }
    fillRef(_: Ref<T | null>, __: string) { return Promise.resolve(undefined) }

    setMultiple(datas: T[]) {
        this.singleCache.set({ key: "key", data: datas })
    }

    async getAll(): Promise<T[] | undefined> {
        const data = await this.singleCache.get("key");
        if (!data) return;

        return data.data;
    }

    async fillAllRef(ref: Ref<T[] | null> | null) {
        if (!ref || ref.value !== null) return;
        const cachedValue = await this.getAll();
        if (cachedValue && !ref.value) {
            ref.value = cachedValue;
        }
    }
}

function requestWait<T>(request: IDBRequest<T>): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        request.onerror = () => {
            reject(request.error);
        }

        request.onsuccess = () => {
            resolve(request.result);
        }
    });
}
