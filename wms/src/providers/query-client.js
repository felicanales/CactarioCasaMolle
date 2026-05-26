"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function ReactQueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,   // 5 minutos: datos se consideran frescos
            gcTime: 10 * 60 * 1000,      // 10 minutos: cache en memoria
            retry: 1,
            refetchOnWindowFocus: false,  // No re-fetch al volver al tab (datos no cambian solos)
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
