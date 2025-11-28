
import { BookData } from "../types";

const DB_NAME = 'BookGenLibrary';
const DB_VERSION = 1;
const STORE_NAME = 'books';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => reject("IndexedDB Error");

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };
    });
};

export const saveBook = async (book: BookData): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const updatedBook = { ...book, updatedAt: Date.now() };
        const request = store.put(updatedBook);

        request.onsuccess = () => resolve();
        request.onerror = () => reject("Failed to save book");
    });
};

export const getAllBooks = async (): Promise<BookData[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('updatedAt');
        const request = index.openCursor(null, 'prev'); // Sort by newest
        const results: BookData[] = [];

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        request.onerror = () => reject("Failed to load library");
    });
};

export const deleteBook = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Failed to delete book");
    });
};

export const getBookById = async (id: string): Promise<BookData | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to get book");
    });
};

export const duplicateBook = async (book: BookData): Promise<BookData> => {
    const newBook: BookData = {
        ...book,
        id: crypto.randomUUID(),
        title: `${book.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    await saveBook(newBook);
    return newBook;
}
