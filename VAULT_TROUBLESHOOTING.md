# Vault Troubleshooting Guide

If you encounter the error `Vault sync failed: Encryption failed` when attempting to save a credential to the Project Vault on a fresh installation, please review the following architectural requirements and configuration steps.

## 1. Missing `VAULT_MASTER_KEY`? (Zero-Knowledge Architecture)

You might assume this error is due to a missing `.env` variable such as `VAULT_MASTER_KEY` or `ENCRYPTION_KEY`. 

**This is a misconception.** Noobieteam utilizes a **Zero-Knowledge Architecture**. The backend does not use a global environment variable to encrypt vault payloads, as doing so would allow server administrators to centrally decrypt all user secrets. 

Instead, the AES-256-GCM encryption cipher in `server/crypto.js` dynamically derives the 256-bit cryptographic key directly from the user's personal credentials (`password` or `vaultPin`).

## 2. The Actual Fix: Google OAuth & The Master PIN

The most common cause for the `Encryption failed` (HTTP 400) error on a fresh open-source installation is related to **Google OAuth**.

If you signed in via the "Continue with Google" button, your user profile does not contain a standard password. When the frontend attempts to encrypt a new secret, it sends an empty payload for the key, causing the Node.js `crypto` module to reject the cipher generation.

**Configuration Steps:**
1. Log into your Noobieteam workspace via Google OAuth.
2. When you land on the **Workspace Hub (Home Page)**, the system will immediately prompt you with a mandatory **"Create Master Vault PIN"** pop-out modal if you do not have a PIN set.
3. Enter a secure 6+ character PIN. This PIN is hashed and securely stored in MongoDB as your `vaultPin`.
4. You can now navigate to any workspace and open the **Vault** tab. When you save a credential, the system will successfully use your Vault PIN to execute the AES-GCM encryption.

*(Note: The backend `server/crypto.js` has been updated to explicitly log a warning to your server console if this PIN is missing, rather than failing silently!)*

## 3. System-Level Dependencies (OpenSSL)

If you have configured your Vault PIN but are still receiving encryption errors, verify your server's system-level dependencies.

The backend encryption relies heavily on Node.js's native `crypto` module (`crypto.scryptSync`, `crypto.createCipheriv`). Under the hood, this module uses **OpenSSL**.
* **Standard Environments (Ubuntu/Debian):** OpenSSL is typically bundled with Node.js binaries and requires no extra configuration.
* **Minimal Docker Containers (Alpine Linux):** If you are deploying via a highly stripped-down Alpine Linux container, you may need to manually install the OpenSSL shared libraries.

**Alpine Installation Step:**
```bash
apk add --no-cache openssl
```

## 4. Environment Variables Verification
Ensure your baseline authentication is working correctly. While `VAULT_MASTER_KEY` is not used, the JSON Web Token signature requires the following in your `.env` file to maintain session integrity:

```env
JWT_SECRET=your_super_secret_jwt_key_here
```

Once the Master PIN is configured and OpenSSL is accessible by the Node runtime, the Project Vault will sync flawlessly.
