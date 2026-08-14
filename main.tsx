import { createRoot } from "react-dom/client";
import App from "./App";
import { installErrorMonitor } from "./lib/error-monitor";
import "./index.css";

// Install the global error monitor before rendering so any error during mount
// is captured. It is a no-op if the app is already running.
installErrorMonitor();

createRoot(document.getElementById("root")!).render(<App />);
