import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import PwaUpdateToast from "./components/PwaUpdateToast";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
        <PwaUpdateToast />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
