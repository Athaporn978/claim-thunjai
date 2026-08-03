"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dict, type Lang, type Dict } from "./i18n";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Dict }>({
  lang: "th",
  setLang: () => {},
  t: dict.th as unknown as Dict,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("ctj-lang")) as Lang | null;
    if (saved === "en" || saved === "th") setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("ctj-lang", l);
  };
  return <Ctx.Provider value={{ lang, setLang, t: dict[lang] as unknown as Dict }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
