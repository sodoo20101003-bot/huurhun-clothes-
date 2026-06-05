"use client";
import { createContext, useContext, useEffect, useState } from "react";

const FavoritesContext = createContext(null);
const KEY = "huurhun_favorites";

export function FavoritesProvider({ children }) {
  const [ids, setIds] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch (_) {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(ids));
  }, [ids, ready]);

  function toggle(id) {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function isFavorite(id) {
    return ids.includes(id);
  }

  function remove(id) {
    setIds((prev) => prev.filter((x) => x !== id));
  }

  return (
    <FavoritesContext.Provider value={{ ids, toggle, isFavorite, remove, count: ids.length, ready }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
