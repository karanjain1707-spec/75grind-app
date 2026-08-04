import React from "react";
import ReactDOM from "react-dom/client";
import { installStorage } from "./storage.js";
import App from "./App.jsx";

installStorage();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
