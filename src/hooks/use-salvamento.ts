import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoSalvamento = "ocioso" | "salvando" | "salvo" | "pendente" | "erro";

type Tarefa<T> = { chave: string; payload: T };

/**
 * Salvamento automático com debounce + fila local (localStorage) para reenviar
 * quando a conexão cair e voltar. A chave garante idempotência por item.
 */
export function useSalvamento<T>(nomeFila: string, enviar: (payload: T) => Promise<void>) {
  const [estado, setEstado] = useState<EstadoSalvamento>("ocioso");
  const [pendentes, setPendentes] = useState(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;

  const lerFila = useCallback((): Array<Tarefa<T>> => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(nomeFila) || "[]") as Array<Tarefa<T>>;
    } catch {
      return [];
    }
  }, [nomeFila]);

  const gravarFila = useCallback(
    (fila: Array<Tarefa<T>>) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(nomeFila, JSON.stringify(fila));
      setPendentes(fila.length);
    },
    [nomeFila],
  );

  const enfileirar = useCallback(
    (chave: string, payload: T) => {
      const fila = lerFila().filter((t) => t.chave !== chave);
      fila.push({ chave, payload });
      gravarFila(fila);
      setEstado("pendente");
    },
    [gravarFila, lerFila],
  );

  const processarFila = useCallback(async () => {
    const fila = lerFila();
    if (!fila.length) return;
    setEstado("salvando");
    const restantes: Array<Tarefa<T>> = [];
    for (const tarefa of fila) {
      try {
        await enviarRef.current(tarefa.payload);
      } catch {
        restantes.push(tarefa);
      }
    }
    gravarFila(restantes);
    setEstado(restantes.length ? "pendente" : "salvo");
  }, [gravarFila, lerFila]);

  const salvar = useCallback(
    (chave: string, payload: T, debounceMs = 700) => {
      setEstado("salvando");
      const anterior = timers.current[chave];
      if (anterior) clearTimeout(anterior);
      timers.current[chave] = setTimeout(() => {
        void (async () => {
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            enfileirar(chave, payload);
            return;
          }
          try {
            await enviarRef.current(payload);
            setEstado((atual) => (atual === "pendente" ? atual : "salvo"));
          } catch {
            enfileirar(chave, payload);
          }
        })();
      }, debounceMs);
    },
    [enfileirar],
  );

  useEffect(() => {
    setPendentes(lerFila().length);
    const aoVoltar = () => void processarFila();
    window.addEventListener("online", aoVoltar);
    const intervalo = setInterval(() => {
      if (navigator.onLine) void processarFila();
    }, 15000);
    return () => {
      window.removeEventListener("online", aoVoltar);
      clearInterval(intervalo);
    };
  }, [lerFila, processarFila]);

  return { estado, pendentes, salvar, processarFila };
}