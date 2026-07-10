import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Unable to find #root element for mockup sandbox.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
