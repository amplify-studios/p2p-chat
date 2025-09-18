"use client";

import { useEffect, useState } from "react";
import type { MyDB } from "@/lib/storage";
import { getDB } from "@/lib/storage";
import { IDBPDatabase } from "idb";

export function useDB() {
  const [db, setDb] = useState<IDBPDatabase<MyDB> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const database = await getDB();
      if (!cancelled) setDb(database);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return db;
}

