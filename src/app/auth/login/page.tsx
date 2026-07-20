"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { startLogin } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const { authenticated, isLoading } = useAuth();
  const [loginType, setLoginType] = useState<"super-admin" | "admin">("super-admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const isSuperAdmin = loginType === "super-admin";
  const subtitle = isSuperAdmin
    ? "Sign in to the Super Admin portal"
    : "Sign in to your Enterprise Owner portal";
  const buttonLabel = isSuperAdmin
    ? "Sign In as Super Admin"
    : "Sign In as Enterprise Owner";
  const trimmedEmail = email.trim().toLowerCase();
  const canSubmit = isSuperAdmin
    ? Boolean(trimmedEmail) && Boolean(password) && !isSubmitting
    : !isSubmitting && !isLoading;

  useEffect(() => {
    if (!isSuperAdmin && !isLoading && authenticated) {
      router.replace("/admin/dashboard");
    }
  }, [authenticated, isLoading, isSuperAdmin, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setLoginError(null);
    setIsSubmitting(true);

    try {
      if (isSuperAdmin) {
        const demoCredentialsError = "Please enter correct demo credentials.";

        if (
          trimmedEmail !== "superwis@gmail.com" ||
          password !== "superpass"
        ) {
          setLoginError(demoCredentialsError);
          return;
        }

        router.push("/dashboard");
        return;
      }

      startLogin();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to start secure login.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#06201c] lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-[1.08fr_1fr]">
        <section className="relative flex min-h-[640px] overflow-hidden bg-[#1f6a58] px-6 py-8 text-white sm:px-10 lg:h-screen lg:min-h-0 lg:px-[58px] lg:py-9">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(255,255,255,0.18)_0_1px,transparent_1px),linear-gradient(135deg,rgba(16,88,72,0.94),rgba(45,116,95,0.86))] bg-[length:48px_48px,auto]" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute left-[-3%] top-[12%] h-80 w-60 -rotate-5 rounded-[28px] border border-white/10 bg-transparent" />
            <div className="absolute left-[3%] top-[52%] h-64 w-28 rotate-3 rounded-[30px] border border-white/10 bg-transparent" />
            <div className="absolute right-[7%] top-[11%] h-64 w-[28rem] rotate-3 rounded-2xl border border-white/10 bg-transparent" />
            <div className="absolute right-[4%] top-[50%] h-64 w-28 -rotate-3 rounded-[30px] border border-white/10 bg-transparent" />
            <div className="absolute left-[34%] bottom-[10%] h-40 w-72 rotate-[-4deg] rounded-[24px] border border-white/10 bg-transparent" />
            <div className="absolute right-[-7%] bottom-[-8%] h-64 w-[31rem] rotate-3 rounded-2xl border border-white/10 bg-transparent" />
          </div>

          <div className="relative z-10 flex w-full max-w-[760px] flex-col lg:h-full">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/10 lg:h-10 lg:w-10">
                <svg
                  aria-hidden="true"
                  className="h-8 w-8 lg:h-5 lg:w-5"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M25 7C15.2 7.9 8.3 13.6 7.6 23.7C15.7 24.2 23.1 18.8 25 7Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.5 22.8C12 19.4 15.4 17.5 20 16.6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-[28px] font-bold tracking-tight lg:text-[22px]">
                Invigorate Health
              </p>
            </div>

            <div className="mt-24 max-w-[620px] sm:mt-28 lg:mt-12">
              <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-white/65 sm:text-[13px]">
                Enterprise Platform
              </p>
              <h1 className="mt-6 max-w-[500px] text-[42px] font-extrabold leading-[1.14] tracking-normal text-white sm:text-[50px] lg:mt-5 lg:text-[36px] lg:leading-[1.12]">
                Power Your Wellness Business
              </h1>
              <p className="mt-7 max-w-[500px] text-xl leading-[1.55] text-white/95 sm:text-[23px] lg:mt-5 lg:text-[16px] lg:leading-[1.42]">
                Manage enterprises, showcase products &amp; services, host events,
                and build a thriving wellness community - all in one platform.
              </p>
            </div>

            <div className="mt-auto grid w-full max-w-[430px] grid-cols-3 gap-6 pb-10 pt-20 lg:pb-12 lg:pt-8">
              <div className="text-left">
                <p className="text-[32px] font-extrabold lg:text-[24px]">142+</p>
                <p className="mt-1.5 text-[12px] text-white/70">Enterprises</p>
              </div>
              <div className="text-left">
                <p className="text-[32px] font-extrabold lg:text-[24px]">8.2K</p>
                <p className="mt-1.5 text-[12px] text-white/70">
                  Active Members
                </p>
              </div>
              <div className="text-left">
                <p className="text-[32px] font-extrabold lg:text-[24px]">$2.4M</p>
                <p className="mt-1.5 text-[12px] text-white/70">
                  Platform GMV
                </p>
              </div>
            </div>

            <p className="absolute bottom-1 left-0 right-0 text-center text-[11px] text-white/45">
              &copy; 2026 Invigorate Health, Inc. — Admin & Owner Portal
            </p>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:h-screen lg:min-h-0 lg:px-12 lg:py-8">
          <div className="w-full max-w-[430px]">
            <div className="mb-6 flex justify-center">
              <div className="inline-flex rounded-full bg-[#e9f4ee] p-0.5 shadow-[0_1px_0_rgba(7,53,45,0.03)]">
                <button
                  type="button"
                  onClick={() => {
                    setLoginType("super-admin");
                    setEmail("");
                    setPassword("");
                    setLoginError(null);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
                    isSuperAdmin
                      ? "bg-white text-[#1f6a58] shadow-sm"
                      : "text-[#6f8c84] hover:text-[#35544b]"
                  }`}
                  aria-pressed={isSuperAdmin}
                >
                  <span className="inline-flex items-center gap-2">
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 3L19 6V11C19 15.5 16.1 19.7 12 21C7.9 19.7 5 15.5 5 11V6L12 3Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Super Admin</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginType("admin");
                    setEmail("");
                    setPassword("");
                    setLoginError(null);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
                    !isSuperAdmin
                      ? "bg-white text-[#1f6a58] shadow-sm"
                      : "text-[#6f8c84] hover:text-[#35544b]"
                  }`}
                  aria-pressed={!isSuperAdmin}
                >
                  <span className="inline-flex items-center gap-2">
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 21H20"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6 21V5C6 4.45 6.45 4 7 4H14C14.55 4 15 4.45 15 5V21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M15 9H18C18.55 9 19 9.45 19 10V21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 8H12M9 12H12M9 16H12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>Enterprise Owner</span>
                  </span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-[24px] font-extrabold tracking-tight text-[#041a16] sm:text-[26px]">
                Welcome back
              </h2>
              <p className="mt-1.5 text-[14px] text-[#55746b]">{subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
              {isSuperAdmin ? (
                <>
                  <label className="block">
                    <span className="text-[12px] font-bold text-[#051915]">Email Address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setLoginError(null);
                      }}
                      placeholder="admin@invigoratehealth.com"
                      className="mt-1.5 h-10 w-full rounded-[13px] border border-[#c9ddd7] bg-[#f1f7f4] px-3.5 text-[14px] text-[#173b34] outline-none transition placeholder:text-[#8aa19a] focus:border-[#226b58] focus:ring-4 focus:ring-[#226b58]/10"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between gap-4">
                      <span className="text-[12px] font-bold text-[#051915]">Password</span>
                      <a href="#" className="text-[12px] font-semibold text-[#0b5b4e]">
                        Forgot?
                      </a>
                    </span>
                    <span className="relative mt-2 block">
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setLoginError(null);
                        }}
                        placeholder="Enter your password"
                        className="h-10 w-full rounded-[13px] border border-[#c9ddd7] bg-[#f1f7f4] px-3.5 pr-10 text-[14px] text-[#173b34] outline-none transition placeholder:text-[#8aa19a] focus:border-[#226b58] focus:ring-4 focus:ring-[#226b58]/10"
                      />
                      <svg
                        aria-hidden="true"
                        className="absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b8b83]"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="5"
                          y="10"
                          width="14"
                          height="10"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M8 10V7a4 4 0 0 1 8 0v3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </label>
                </>
              ) : (
                <p className="rounded-[13px] border border-[#c9ddd7] bg-[#f1f7f4] px-4 py-3 text-[13px] leading-5 text-[#55746b]">
                  Continue to the secure Invigorate Health sign-in page.
                </p>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-10 w-full rounded-[13px] bg-[#1f6a58] text-[14px] font-bold text-white shadow-[0_3px_6px_rgba(0,0,0,0.14)] transition hover:bg-[#185746] focus:outline-none focus:ring-4 focus:ring-[#226b58]/20"
              >
                {isSubmitting ? "Signing in..." : buttonLabel}
              </button>
            </form>

            {loginError ? (
              <p className="mt-3 text-sm font-medium text-[#b42318]">{loginError}</p>
            ) : null}

            <div className="mt-5">
              {isSuperAdmin ? (
                <div className="rounded-[13px] border border-[#f0c36a] bg-[#fff8e6] px-3.5 py-3 text-[12px] text-[#7a4b00]">
                  <p className="flex items-center gap-2 font-bold">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 3L19 6V11C19 15.5 16.1 19.7 12 21C7.9 19.7 5 15.5 5 11V6L12 3Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Super Admin Access</span>
                  </p>
                  <p className="mt-0.5">This portal is restricted to authorized administrators only.</p>
                  <p className="mt-0.5">All actions are logged.</p>
                </div>
              ) : (
                <p className="text-center text-[13px] text-[#55746b]">
                  Not registered yet?{" "}
                  <Link
                    href="/auth/register"
                    className="font-semibold text-[#0b5b4e] underline-offset-2 hover:underline"
                  >
                    Apply for access &rarr;
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
