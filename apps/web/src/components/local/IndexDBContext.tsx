"use client"; // Required for using state & context in Next.js App Router

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { IDBPDatabase } from "idb";
import type { MyDB } from "@/lib/storage";
import { getDB } from "@/lib/storage";
import { get } from "http";

const IndexedDBContext = createContext<IDBPDatabase<MyDB> | null>(null);

export function IndexDBProvider({ children }: { children: React.ReactNode }) {
    const [db, setDb] = useState<IDBPDatabase<MyDB> | null>(null);

    useEffect(() => {
        getDB().then(setDb).catch(console.error);
    }, []);

    // Wait for DB to be ready before rendering children
    if (!db) return null;

    
    return (
        <IndexedDBContext.Provider value= { db } >
        {children}
        </IndexedDBContext.Provider>
        );
}

export function useIndexedDB() {
    const db = useContext(IndexedDBContext);
    if (!db) {
        throw new Error("useIndexedDB must be used within an IndexedDBProvider");
    }
    return db;
}
