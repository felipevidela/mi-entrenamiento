import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

document.documentElement.style.height = "100%";
document.body.style.margin = "0";
document.body.style.minHeight = "100%";
document.body.style.background = "#0E1F2A";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
