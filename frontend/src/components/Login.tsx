"use client";

import { useState, type FormEvent } from "react";

type LoginProps = { onLogin: (username: string, password: string) => Promise<void> };

export const Login = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-[32px] border border-cyan-300/20 bg-[linear-gradient(145deg,rgba(9,38,76,0.82),rgba(21,13,54,0.78))] p-8 text-cyan-50 shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--primary-blue)]">Project workspace</p>
        <h1 className="mt-4 font-display text-4xl font-semibold">Welcome back</h1>
        <p className="mt-3 text-sm leading-6 text-cyan-100/65">Sign in to open your board and AI project assistant.</p>
        <label className="mt-8 block text-sm font-semibold">Username<input aria-label="Username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-cyan-300/15 bg-[#071c3a]/70 px-4 py-3 text-cyan-50 outline-none focus:border-[var(--primary-blue)]" autoComplete="username" /></label>
        <label className="mt-4 block text-sm font-semibold">Password<input aria-label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-cyan-300/15 bg-[#071c3a]/70 px-4 py-3 text-cyan-50 outline-none focus:border-[var(--primary-blue)]" autoComplete="current-password" /></label>
        {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-[var(--secondary-purple)] px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60">{loading ? "Signing in…" : "Sign in"}</button>
        <p className="mt-5 text-center text-xs text-cyan-100/50">MVP credentials: user / password</p>
      </form>
    </main>
  );
};
