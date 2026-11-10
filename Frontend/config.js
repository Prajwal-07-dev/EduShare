/*
 * Where the EduShare API lives.
 *
 * - Opened through the Node server (http://localhost:3000): same origin, so "/api" works.
 * - Opened through VS Code Live Server (e.g. http://127.0.0.1:5500): the API is on port 3000.
 * - Deployed with the frontend on a different domain: set the full URL below.
 */
(function () {
  var host = window.location.hostname;
  var isLocal = host === "localhost" || host === "127.0.0.1";

  window.EDUSHARE_API_BASE =
    isLocal && window.location.port !== "3000"
      ? "http://localhost:3000/api"
      : "/api";

  // Example for a separately hosted frontend:
  // window.EDUSHARE_API_BASE = "https://your-backend.example.com/api";
})();
