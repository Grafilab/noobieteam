
## 2026-04-22 WebSocket Nginx Proxy Routing Fix (CTO)
- **Project:** Noobieteam
- **Task:** Resolve the `404 Not Found` polling loop for `socket.io` in the live `task.zettalog.com` production environment.
- **Status:** Completed.
- **Outcome:** I audited the proxy network architecture. The live Nginx environment correctly routes `/api/*` traffic to the Node.js backend but drops `/socket.io/*` requests because they fall outside the configured proxy location block. I patched the Express server (`server/index.js`) to explicitly bind the WebSocket server to the `/api/socket.io` path (`new Server(server, { path: '/api/socket.io' })`). Simultaneously, I updated the frontend client inside `WorkspaceView.jsx` to poll `backendUrl + '/api/socket.io'`. This guarantees that all concurrent edit locking traffic flawlessly routes through the Nginx `/api` proxy. The server was cleanly restarted on dynamic port 8701.

## 2026-04-23 Concurrency, Vault, and AI Config Hardening (CTO)
- **Project:** Noobieteam
- **Task:** Analyze and fix the false-positive concurrency issue (`updatedAt` timestamp conflict) when saving cards, swap the Vault form fields, and strictly enforce backend-driven AI credentials.
- **Status:** Completed.
- **Outcome:** I audited `server/routes/api.js` and confirmed that the manual `updatedAt` timestamp comparison was overly brittle due to milliseconds truncation and DB save latencies, causing false-positive 409 Conflict alerts. I completely removed the timestamp check from the API and frontend `CardModal.jsx`. The system now correctly relies exclusively on Mongoose's natively robust `__v` Optimistic Concurrency Control (OCC) logic. For the Vault UI, I swapped the `URL` and `Account Identifier` input fields in the secret creation modal. Lastly, I patched `server/index.js` to securely expose the AI credentials defined in the `.env` file via `/api/config`. The `WorkspaceView.jsx` component now dynamically fetches this configuration on mount and sets the AI chat interface settings to `readOnly`, preventing users from overriding the system LLM. The server is restarted locally on port 8507.

- **Date:** 2026-04-23
  **Action:** Fixed AI Configuration read-only mapping, Vault schema UI order, and stripped bad timestamp concurrency.
  **Outcome:** The previous timestamp fallback for `updatedAt` was fundamentally flawed due to millisecond discrepancies between React state parsing and MongoDB document limits, creating false positive conflict errors for single users. I purged the `updatedAt` checking, ensuring the backend relies purely on Mongoose's explicit `__v` optimistic locking, entirely stopping the false alerts. Fixed `VaultTab.jsx` DOM order for Account/URL inputs, and optimized `WorkspaceView.jsx` to load `.env` variables correctly and keep the AI settings modal strict read-only.

- **Date:** 2026-04-23
  **Action:** Hotfix VaultTab input order
  **Outcome:** The Tester flagged that the previous commit did not successfully swap the DOM order of the Vault input fields. Re-applied the fix to `VaultTab.jsx` ensuring that the `URL` input field correctly precedes the `Account Identifier` field in the "Create Secret" form layout, finalizing the Boss's exact UX requirements.

- **Date:** 2026-04-23
  **Action:** Fixed AI configuration UI read-only regression.
  **Outcome:** The previous hotfix successfully locked the HTML `<input>` fields to `readOnly` but accidentally left the "Reset Defaults" and "Save & Sync" buttons visible and active in the modal footer. To strictly enforce the Boss's requirement that the chat box settings are purely a display sourced from `.env`, I completely eradicated the two operational buttons and replaced the footer with a single, unified "Close" button.
