import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        theme="dark"
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "#161c24",
            border: "1px solid #26303b",
            color: "#e8eef5",
            fontFamily: "Manrope, system-ui, sans-serif",
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
