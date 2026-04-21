# Noobieteam UI/UX Architecture Updates (Extension)

## 10. Vault: Reveal Secret Flow & Error Handling

### 10.1 Forced Master PIN Creation (Google OAuth)
- **UX Goal:** Prevent the "Vault sync failed: Encryption failed" error from ever happening by proactively ensuring all users have a decryption key.
- **Trigger Location:** The Workspace Hub (Home Page).
- **Logic:** 
  1. Immediately upon a user logging in and landing on the Workspace Hub, the frontend must check their profile state (`hasPassword` or `hasVaultPin`).
  2. If the user authenticated via Google OAuth AND does not have a Master Vault PIN set, a **blocking, glassmorphism modal** must pop up automatically.
- **Modal UI Specs:**
  - **Title:** "Create Master Vault PIN"
  - **Description:** "To securely encrypt and access your Vault credentials, you must create a Master PIN. This PIN replaces a standard password."
  - **Inputs:** `PIN` and `Confirm PIN` (minimum 6 characters).
  - **Constraint:** The user CANNOT dismiss this modal (no close button, clicking the backdrop does nothing). They must set a PIN to continue using the application.

## 16. AI Assistant Icon CSS Correction
- **Issue:** The SVG icon inside the NoobieHelper floating button is misaligned (run off from the circle).
- **CSS Fix Directive:** The wrapper `<button>` or `<div>` for the AI Assistant floating icon must utilize precise Flexbox centering classes to align the inner SVG:
  - `display: flex` (`flex`)
  - `align-items: center` (`items-center`)
  - `justify-content: center` (`justify-center`)
  - If the SVG has padding or margin inherited, it must be stripped (`p-0`, `m-0`).
  - Ensure the parent container has equal height and width (e.g., `w-14 h-14` or `w-16 h-16`) and `rounded-full` to maintain the perfect circular shape around the centered icon.
