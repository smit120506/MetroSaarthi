import React from "react"
import ReactDOM from "react-dom/client"
import App from "./app/App"
import "./index.css"

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js"),
  )
} else if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations.map((registration) => registration.unregister()),
      ),
    )
  caches.delete("metrosaarthi-shell-v1")
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
