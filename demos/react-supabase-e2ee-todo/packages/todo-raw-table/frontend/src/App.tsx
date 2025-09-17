import { useEffect, useMemo, useState } from "react";
import { createPasswordCrypto } from "@crypto/password";
import { createWebAuthnCrypto, WebAuthnProvider } from "@crypto/webauthn";
import { TodoList } from "./components/TodoList";
import {
  ShieldCheckIcon,
  KeyIcon,
  ArrowRightIcon,
  UserIcon,
  PowerIcon,
  BoltIcon,
  ChevronDownIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import SyncStatusBadge from "./components/SyncStatusBadge";
import Identicon from "./components/Identicon";
import {
  getSupabase,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  signInAnonymously,
  isAnonymousSupported,
} from "./lib/supabase";
import { usePowerSync } from "@powersync/react";
import { useQuery } from "@powersync/react";
import { useWrappedKey } from "./powersync/keys";
import { ensureDEKWrapped } from "./lib/keyring";
import type { CryptoProvider } from "@crypto/interface";
import { createDEKCrypto } from "@crypto/sqlite";

export default function App() {
  const db = usePowerSync();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [useWebAuthn, setUseWebAuthn] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [authed, setAuthed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [anonAvailable, setAnonAvailable] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passphraseHint, setPassphraseHint] = useState<
    "unknown" | "checking" | "match" | "mismatch" | "no-key" | "not-authed"
  >("unknown");

  // Reactive wrapped key from local DB for current provider
  const { data: wrappedKeyRows } = useWrappedKey(
    userId,
    useWebAuthn ? "webauthn" : "password",
  );
  const wrappedKey = (wrappedKeyRows?.[0] as any) ?? null;
  // Per-user key only; no per-list key ids
  const [dataCrypto, setDataCrypto] = useState<CryptoProvider | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [vaultExists, setVaultExists] = useState<"unknown" | "none" | "exists">(
    "unknown",
  );
  const [hasPasswordVault, setHasPasswordVault] = useState(false);
  const [hasPasskeyVault, setHasPasskeyVault] = useState(false);
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [passModalError, setPassModalError] = useState<string | null>(null);
  const [passkeyStatus, setPasskeyStatus] = useState<
    "idle" | "in_progress" | "ready" | "error"
  >("idle");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // URL state sync: allow back/forward between setup and main screens
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const readyParam = p.get("ready");
    const provParam = p.get("prov");
    // Only auto-ready for WebAuthn. For password, require entering passphrase after refresh.
    if (readyParam === "1") {
      if (provParam === "webauthn") setReady(true);
      else setReady(false);
    }
    if (provParam === "webauthn") setUseWebAuthn(true);
    // no per-list key id anymore
    const onPop = () => {
      const q = new URLSearchParams(window.location.search);
      const r = q.get("ready") === "1";
      const prov = q.get("prov");
      setUseWebAuthn(prov === "webauthn");
      // Same rule on back/forward: only auto-ready for WebAuthn
      setReady(r && prov === "webauthn");
      // no per-list key id anymore
      setAuthMenuOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function pushMode(nextReady: boolean, provider: "password" | "webauthn") {
    const q = new URLSearchParams(window.location.search);
    q.set("ready", nextReady ? "1" : "0");
    q.set("prov", provider);
    q.delete("key");
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${q.toString()}`,
    );
  }

  // wrappedKey is reactive via useWrappedKey (per-user key id)

  // Simplified hint: rely on presence of a wrapped key for the current provider
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // WebAuthn path: we can't predict until assertion, keep neutral
      if (useWebAuthn) {
        setPassphraseHint("unknown");
        return;
      }
      if (!authed || !userId) {
        setPassphraseHint("not-authed");
        return;
      }
      if (!password) {
        setPassphraseHint("unknown");
        return;
      }
      if (!wrappedKey) {
        setPassphraseHint("no-key");
        return;
      }

      try {
        setPassphraseHint("checking");
        const env = {
          header: {
            v: 1 as const,
            alg: wrappedKey.alg,
            aad: wrappedKey.aad ?? undefined,
            kdf: { saltB64: wrappedKey.kdf_salt_b64 },
          },
          nB64: wrappedKey.nonce_b64,
          cB64: wrappedKey.cipher_b64,
        };
        const provider = createPasswordCrypto({
          password,
          preferWebCrypto: true,
        });
        await provider.decrypt(env, wrappedKey.aad ?? undefined);
        if (!cancelled) setPassphraseHint("match");
      } catch {
        if (!cancelled) setPassphraseHint("mismatch");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useWebAuthn, authed, userId, wrappedKey, password]);

  const cryptoProvider = useMemo(() => {
    if (!ready) return null;
    if (useWebAuthn) {
      return createWebAuthnCrypto({ keyId: "default" });
    }
    // Prefer WebCrypto PBKDF2 for KDF to avoid heavy Argon2 in UI
    return createPasswordCrypto({ password, preferWebCrypto: true });
  }, [ready, useWebAuthn, password]);

  // Ensure a per-user DEK exists and build a DataCrypto
  useEffect(() => {
    (async () => {
      if (!ready) return;
      if (!userId) return;
      if (!cryptoProvider) return;
      try {
        setKeyError(null);
        const dek = await ensureDEKWrapped(
          db,
          userId,
          useWebAuthn ? "webauthn" : "password",
          cryptoProvider,
        );
        setDataCrypto(createDEKCrypto(dek));
      } catch (e) {
        console.error("Failed to ensure DEK", e);
        setKeyError(
          useWebAuthn
            ? "Passkey could not unlock your data. Try again or reset."
            : "Passphrase mismatch. Try again or reset to start fresh.",
        );
        setDataCrypto(null);
      }
    })();
  }, [ready, userId, cryptoProvider, useWebAuthn, db]);

  // Clear key error on inputs change
  useEffect(() => {
    setKeyError(null);
  }, [useWebAuthn, password]);

  async function resetAccountData() {
    if (!userId) return;
    try {
      await db.writeTransaction(async (tx) => {
        // Remove all wrapped keys and encrypted rows for this user
        await tx.execute("DELETE FROM e2ee_keys WHERE user_id = ?", [userId]);
        await tx.execute("DELETE FROM todos WHERE user_id = ?", [userId]);
      });
      setDataCrypto(null);
      setKeyError(null);
      console.log("Reset account data for user", userId);
      setVaultExists("none");
      setHasPasswordVault(false);
      setHasPasskeyVault(false);
      // Keep ready true, user can immediately set a new credential and continue
    } catch (e) {
      console.error("Reset failed", e);
    }
  }

  // Reactive vault existence via live query
  const { data: vaultRows, isFetching: vaultFetching } = useQuery(
    "SELECT provider FROM e2ee_keys WHERE user_id = ?",
    [userId ?? ""],
    { throttleMs: 50 },
  );

  useEffect(() => {
    if (!userId) {
      console.log("Reset on no user");
      setVaultExists("unknown");
      setHasPasswordVault(false);
      setHasPasskeyVault(false);
      return;
    }
    try {
      const rows = Array.isArray(vaultRows) ? (vaultRows as any[]) : [];
      const providers = new Set(rows.map((r: any) => r.provider));
      const any = providers.size > 0;
      console.log("Vault providers for user", userId, providers, rows);
      setVaultExists(any ? "exists" : "none");
      setHasPasswordVault(providers.has("password"));
      setHasPasskeyVault(providers.has("webauthn"));
    } catch (e) {
      console.error("Vault query failed", e);
      setVaultExists("unknown");
      setHasPasswordVault(false);
      setHasPasskeyVault(false);
    }
  }, [vaultRows, vaultFetching, userId]);

  // If only one unlock method exists, auto-select it
  useEffect(() => {
    if (vaultExists !== "exists") return;
    if (hasPasswordVault && !hasPasskeyVault) setUseWebAuthn(false);
    if (hasPasskeyVault && !hasPasswordVault) setUseWebAuthn(true);
  }, [vaultExists, hasPasswordVault, hasPasskeyVault]);

  // Reset inputs when switching methods
  useEffect(() => {
    setPassModalError(null);
    if (useWebAuthn) {
      setPassword("");
    } else {
      setPass1("");
      setPass2("");
    }
  }, [useWebAuthn]);

  // Auto-prompt WebAuthn registration when selecting Passkey on Create flow
  useEffect(() => {
    (async () => {
      if (vaultExists === "exists") return;
      if (!userId) return;
      if (!useWebAuthn) return;
      if (passkeyStatus === "in_progress" || passkeyStatus === "ready") return;
      try {
        setPasskeyStatus("in_progress");
        setPasskeyError(null);
        const prov = createWebAuthnCrypto({ keyId: "default" });
        const label = userId.slice(0, 6) + "…" + userId.slice(-4);
        await (prov as any).register(label);
        setPasskeyStatus("ready");
      } catch (e: any) {
        setPasskeyStatus("error");
        setPasskeyError(e?.message ?? "Passkey setup failed. Try again.");
      }
    })();
  }, [useWebAuthn, vaultExists, userId, passkeyStatus]);

  async function createPassphraseVault() {
    console.log("createPassphraseVault");
    if (!userId) {
      setPassModalError("User not authenticated.");
      return;
    }
    if (!pass1 || pass1 !== pass2) {
      setPassModalError("Passphrases do not match.");
      return;
    }
    setCreating(true);
    try {
      // Ensure local DB is initialized
      await waitForLocal();
      const wrapper = createPasswordCrypto({
        password: pass1,
        preferWebCrypto: true,
      });
      const dek = await ensureDEKWrapped(db, userId, "password", wrapper);
      setDataCrypto(createDEKCrypto(dek));
      setUseWebAuthn(false);
      setReady(true);
      pushMode(true, "password");
    } catch (e: any) {
      setPassModalError(e?.message ?? "Failed to create vault. Try again.");
    } finally {
      setCreating(false);
    }
  }

  async function createPasskeyVault() {
    if (!userId) {
      setPasskeyStatus("error");
      setPasskeyError("User ID not found.");
      return;
    }
    setCreating(true);
    try {
      // Ensure local DB is initialized
      await waitForLocal();
      let prov = createWebAuthnCrypto({ keyId: "default" });
      if (passkeyStatus !== "ready") {
        const label = userId.slice(0, 6) + "…" + userId.slice(-4);
        await (prov as any).register(label);
        setPasskeyStatus("ready");
      }
      const dek = await ensureDEKWrapped(db, userId, "webauthn", prov);
      setDataCrypto(createDEKCrypto(dek));
      setUseWebAuthn(true);
      setReady(true);
      pushMode(true, "webauthn");
    } catch (e: any) {
      setPasskeyStatus("error");
      setPasskeyError(e?.message ?? "Failed to create passkey vault.");
    } finally {
      setCreating(false);
    }
  }

  async function waitForLocal(timeoutMs: number = 3000): Promise<void> {
    const t0 = Date.now();
    // Poll until a trivial query succeeds or timeout
    while (true) {
      try {
        await db.getAll("SELECT 1");
        return;
      } catch {
        if (Date.now() - t0 > timeoutMs)
          throw new Error("Local database not ready");
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  useEffect(() => {
    (async () => {
      if (!ready) return;
      if (!userId) return;
      try {
        const rows = await db.getAll(
          "SELECT provider, COUNT(*) as cnt FROM e2ee_keys WHERE user_id = ? GROUP BY provider",
          [userId],
        );
        console.debug("[keys] counts for user", userId, rows);
      } catch (e) {
        console.debug("[keys] count query failed", e);
      }
    })();
  }, [ready, userId, db]);

  useEffect(() => {
    const sb = getSupabase();

    if (!sb) return;
    setAnonAvailable(isAnonymousSupported());
    // initial fetch — prefer cached session (no network) for snappy UI
    sb.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setUserId(data.session?.user?.id ?? null);
    });
    // subscribe to changes
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  function shortId(id: string) {
    if (id.length <= 10) return id;
    return id.slice(0, 6) + "…" + id.slice(-4);
  }

  // Connection status surfaces via SyncStatusBadge; explicit connect not required here.

  if (!ready || !cryptoProvider || !dataCrypto) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <ShieldCheckIcon className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Secret tasks
                </h1>
                <p className="muted -mt-0.5">End‑to‑end encrypted tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-3 h-9">
              {userId ? <SyncStatusBadge /> : null}
              {userId ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 h-9"
                  onClick={() => setAuthMenuOpen((v) => !v)}
                >
                  <Identicon seed={userId} size={22} />
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex items-center gap-2 h-9">
                  <button
                    type="button"
                    className="btn-secondary-sm h-9"
                    onClick={() => setAuthMenuOpen((v) => !v)}
                  >
                    <UserIcon className="h-4 w-4" /> Sign In
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-sm h-9"
                    onClick={async () => {
                      setAuthError(null);
                      try {
                        await signInAnonymously();
                      } catch (e: any) {
                        setAuthError(e?.message ?? String(e));
                      }
                    }}
                    disabled={!anonAvailable}
                  >
                    <UserIcon className="h-4 w-4" /> Guest
                  </button>
                </div>
              )}
              {authMenuOpen && !userId && (
                <div className="absolute right-0 mt-2 w-72 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-3 z-10">
                  <div className="flex flex-col gap-2">
                    <input
                      className="input-sm"
                      placeholder="Email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                      className="input-sm"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Password"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        className="btn-secondary-sm"
                        onClick={async () => {
                          setAuthError(null);
                          try {
                            await signInWithPassword(email, pwd);
                            setAuthMenuOpen(false);
                          } catch (e: any) {
                            setAuthError(e?.message ?? String(e));
                          }
                        }}
                        disabled={!email || !pwd}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        className="btn-secondary-sm"
                        onClick={async () => {
                          setAuthError(null);
                          try {
                            await signUpWithPassword(email, pwd);
                            setAuthMenuOpen(false);
                          } catch (e: any) {
                            setAuthError(e?.message ?? String(e));
                          }
                        }}
                        disabled={!email || !pwd}
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {authMenuOpen && userId && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-2 z-10">
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    onClick={() => {
                      setAuthMenuOpen(false);
                      signOut();
                    }}
                  >
                    <PowerIcon className="h-4 w-4 inline mr-1" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </header>
          {authError && (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md p-2 mb-3">
              {authError}
            </div>
          )}

          {/* Minimal per-user key setup: choose provider and enter passphrase if needed */}
          <div className="grid grid-cols-1 gap-4 mt-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LockClosedIcon className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">
                    {vaultExists === "exists"
                      ? "Unlock your Vault"
                      : vaultExists === "none"
                        ? "Create your Vault"
                        : "Your Vault"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  {vaultExists === "exists" ? (
                    <>
                      <span>Available:</span>
                      <span className={hasPasswordVault ? "" : "opacity-50"}>
                        Passphrase
                      </span>
                      <span>·</span>
                      <span className={hasPasskeyVault ? "" : "opacity-50"}>
                        Passkey
                      </span>
                    </>
                  ) : vaultExists === "none" ? (
                    <span>Choose a method</span>
                  ) : (
                    <span>Checking vault…</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {!(
                  vaultExists === "exists" &&
                  hasPasskeyVault &&
                  !hasPasswordVault
                ) && (
                  <button
                    type="button"
                    className={`h-9 px-3 rounded-md text-sm border ${!useWebAuthn ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 dark:border-gray-700"}`}
                    onClick={() => setUseWebAuthn(false)}
                    disabled={vaultExists === "exists" && !hasPasswordVault}
                    title={
                      vaultExists === "exists" && !hasPasswordVault
                        ? "No passphrase vault yet"
                        : "Use passphrase"
                    }
                  >
                    Passphrase
                  </button>
                )}
                {!(
                  vaultExists === "exists" &&
                  hasPasswordVault &&
                  !hasPasskeyVault
                ) && (
                  <button
                    type="button"
                    className={`h-9 px-3 rounded-md text-sm border ${useWebAuthn ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 dark:border-gray-700"}`}
                    onClick={() => {
                      setUseWebAuthn(true);
                      setPasskeyStatus("idle");
                      setPasskeyError(null);
                    }}
                    disabled={vaultExists === "exists" && !hasPasskeyVault}
                    title={
                      vaultExists === "exists" && !hasPasskeyVault
                        ? "No passkey vault yet"
                        : "Use passkey"
                    }
                  >
                    Passkey
                  </button>
                )}
                {vaultExists === "exists" && (
                  <button
                    className="ml-auto btn-secondary h-9"
                    onClick={resetAccountData}
                    disabled={!userId}
                  >
                    Reset Vault
                  </button>
                )}
              </div>

              {vaultExists !== "exists" && useWebAuthn && (
                <div className="rounded-md border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/30 p-3 mb-2 text-sm flex items-center gap-2">
                  {passkeyStatus === "ready" ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                      <span>
                        Passkey registered. Click Create Vault to continue.
                      </span>
                    </>
                  ) : passkeyStatus === "in_progress" ? (
                    <>
                      <BoltIcon className="h-4 w-4 text-blue-600" />
                      <span>Waiting for your authenticator…</span>
                    </>
                  ) : passkeyStatus === "error" ? (
                    <>
                      <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
                      <span>
                        {passkeyError ?? "Passkey setup failed. Try again."}
                      </span>
                      <button
                        className="btn-secondary ml-auto"
                        onClick={() => {
                          setPasskeyStatus("idle");
                          setTimeout(() => setUseWebAuthn(true), 0);
                        }}
                      >
                        Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <span>
                        Select Passkey to register your authenticator.
                      </span>
                    </>
                  )}
                </div>
              )}

              {!useWebAuthn && vaultExists === "exists" && (
                <input
                  className="input"
                  type="password"
                  placeholder="Enter your passphrase"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
              {!useWebAuthn && vaultExists !== "exists" && (
                <div className="grid gap-2">
                  <input
                    className="input"
                    type="password"
                    placeholder="Passphrase"
                    value={pass1}
                    onChange={(e) => {
                      setPass1(e.target.value);
                      setPassModalError(null);
                    }}
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Confirm passphrase"
                    value={pass2}
                    onChange={(e) => {
                      setPass2(e.target.value);
                      setPassModalError(null);
                    }}
                  />
                </div>
              )}
              {keyError && (
                <div className="mt-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md p-2">
                  {keyError}
                </div>
              )}

              {vaultExists !== "exists" && !userId && (
                <div className="mb-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md p-2">
                  Sign in to create a Vault.
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-h-9 flex items-center">
                  {vaultExists !== "exists" &&
                    !useWebAuthn &&
                    passModalError && (
                      <div className="inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md px-2 py-1">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>{passModalError}</span>
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  {vaultExists !== "exists" && useWebAuthn && (
                    <button
                      className="btn h-9"
                      onClick={createPasskeyVault}
                      disabled={!userId || creating}
                    >
                      <ArrowRightIcon className="h-4 w-4" /> Create Vault
                    </button>
                  )}
                  {vaultExists !== "exists" && !useWebAuthn && (
                    <button
                      className="btn h-9"
                      onClick={() => {
                        console.log("createPassphraseVault");
                        if (!pass1 || pass1.length < 6) {
                          console.log(
                            "Passphrase must be at least 6 characters.",
                          );
                          setPassModalError(
                            "Passphrase must be at least 6 characters.",
                          );
                          return;
                        }
                        if (pass1 !== pass2) {
                          console.log("Passphrases do not match.");
                          setPassModalError("Passphrases do not match.");
                          return;
                        }
                        console.log("createPassphraseVault");
                        setPassword(pass1);
                        void createPassphraseVault();
                      }}
                      disabled={!userId || creating}
                    >
                      <ArrowRightIcon className="h-4 w-4" />{" "}
                      {creating ? "Creating…" : "Create Vault"}
                    </button>
                  )}
                  {vaultExists === "exists" && (
                    <button
                      className="btn h-9"
                      onClick={() => {
                        setReady(true);
                        pushMode(true, useWebAuthn ? "webauthn" : "password");
                      }}
                      disabled={!userId || (!useWebAuthn && !password)}
                    >
                      <ArrowRightIcon className="h-4 w-4" /> Unlock
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheckIcon className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Encrypted Tasks
            </h1>
          </div>
          <div className="flex items-center gap-3 relative h-9">
            {userId ? (
              <div className="flex items-center h-9">
                <SyncStatusBadge />
              </div>
            ) : null}
            {userId ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 h-9"
                onClick={() => setAuthMenuOpen((v) => !v)}
              >
                <Identicon seed={userId} size={22} />
                <ChevronDownIcon className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2 h-9">
                <button
                  type="button"
                  className="btn-secondary-sm h-9"
                  onClick={() => setAuthMenuOpen((v) => !v)}
                >
                  <UserIcon className="h-4 w-4" /> Sign In
                </button>
                <button
                  type="button"
                  className="btn-secondary-sm h-9"
                  onClick={async () => {
                    setAuthError(null);
                    try {
                      await signInAnonymously();
                    } catch (e: any) {
                      setAuthError(e?.message ?? String(e));
                    }
                  }}
                  disabled={!anonAvailable}
                >
                  <UserIcon className="h-4 w-4" /> Guest
                </button>
              </div>
            )}
            {authMenuOpen && !userId && (
              <div className="absolute right-0 top-10 w-72 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-3 z-10">
                <div className="flex flex-col gap-2">
                  <input
                    className="input-sm"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    className="input-sm"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      onClick={async () => {
                        setAuthError(null);
                        try {
                          await signInWithPassword(email, pwd);
                          setAuthMenuOpen(false);
                        } catch (e: any) {
                          setAuthError(e?.message ?? String(e));
                        }
                      }}
                      disabled={!email || !pwd}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      onClick={async () => {
                        setAuthError(null);
                        try {
                          await signUpWithPassword(email, pwd);
                          setAuthMenuOpen(false);
                        } catch (e: any) {
                          setAuthError(e?.message ?? String(e));
                        }
                      }}
                      disabled={!email || !pwd}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              </div>
            )}
            {authMenuOpen && userId && (
              <div className="absolute right-0 top-10 w-48 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-2 z-10">
                <div className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300">
                  {shortId(userId)}
                </div>
                <button
                  type="button"
                  className="w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  onClick={() => {
                    setAuthMenuOpen(false);
                    signOut();
                  }}
                >
                  <PowerIcon className="h-4 w-4 inline mr-1" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <TodoList crypto={dataCrypto} />

        <footer className="mt-10 muted">
          <p>
            Raw SQLite tables store only metadata (
            <code className="mx-1">user_id</code>,{" "}
            <code className="mx-1">bucket_id</code>) and encrypted envelopes.
          </p>
        </footer>
      </div>

      {/* Inline passphrase errors */}
      {passModalError && vaultExists !== "exists" && !useWebAuthn && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md px-2 py-1">
          {passModalError}
        </div>
      )}
    </div>
  );
}
