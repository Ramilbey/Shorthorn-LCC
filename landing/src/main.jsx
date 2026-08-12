import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import Inspect from "./Inspect.jsx";

// /?rig opens the model viewer instead of the site.
const showRig = new URLSearchParams(window.location.search).has("rig");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>{showRig ? <Inspect /> : <App />}</React.StrictMode>,
);
