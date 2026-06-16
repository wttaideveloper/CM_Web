export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white text-[#06201c] lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-[1.08fr_1fr]">
        <section className="relative flex min-h-[640px] overflow-hidden bg-[#1f6a58] px-6 py-8 text-white sm:px-10 lg:h-screen lg:min-h-0 lg:px-[70px] lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(255,255,255,0.18)_0_1px,transparent_1px),linear-gradient(135deg,rgba(16,88,72,0.94),rgba(45,116,95,0.86))] bg-[length:48px_48px,auto]" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute left-[8%] top-[8%] h-28 w-52 rounded bg-white/10" />
            <div className="absolute left-[25%] top-[22%] h-72 w-[42rem] rounded-lg border border-white/15 bg-white/10" />
            <div className="absolute bottom-[2%] left-[-4%] h-60 w-36 rounded-[28px] border-4 border-white/25 bg-white/10" />
            <div className="absolute bottom-[2%] left-[16%] h-60 w-36 rounded-[28px] border-4 border-white/25 bg-white/10" />
            <div className="absolute bottom-[2%] left-[36%] h-60 w-36 rounded-[28px] border-4 border-white/25 bg-white/10" />
            <div className="absolute bottom-[2%] right-[18%] h-60 w-36 rounded-[28px] border-4 border-white/25 bg-white/10" />
            <div className="absolute right-[7%] top-[7%] h-80 w-52 rounded-lg bg-[#0f5d4a]/70" />
            <div className="absolute bottom-[34%] left-[12%] h-64 w-[26rem] rounded-xl border border-white/15 bg-white/10" />
            <div className="absolute bottom-[34%] right-[8%] h-64 w-[26rem] rounded-xl border border-white/15 bg-white/10" />
          </div>

          <div className="relative z-10 flex w-full max-w-[760px] flex-col lg:h-full">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/10 lg:h-12 lg:w-12">
                <svg
                  aria-hidden="true"
                  className="h-8 w-8 lg:h-7 lg:w-7"
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
              <p className="text-[28px] font-bold tracking-tight lg:text-[26px]">
                Invigorate Health
              </p>
            </div>

            <div className="mt-24 max-w-[620px] sm:mt-28 lg:mt-14">
              <p className="text-sm font-bold uppercase tracking-[0.32em] text-white/65 sm:text-lg">
                Enterprise Platform
              </p>
              <h1 className="mt-6 max-w-[560px] text-[42px] font-extrabold leading-[1.14] tracking-normal text-white sm:text-[50px] lg:mt-5 lg:text-[48px] lg:leading-[1.16]">
                Power Your Wellness Business
              </h1>
              <p className="mt-7 max-w-[550px] text-xl leading-[1.55] text-white/95 sm:text-[23px] lg:mt-5 lg:text-[21px] lg:leading-[1.48]">
                Manage enterprises, showcase products &amp; services, host events,
                and build a thriving wellness community - all in one platform.
              </p>
            </div>

            <div className="mt-auto grid max-w-[540px] grid-cols-3 gap-6 pb-10 pt-20 sm:gap-12 lg:pb-12 lg:pt-8">
              <div>
                <p className="text-[32px] font-extrabold lg:text-[30px]">142+</p>
                <p className="mt-1.5 text-base text-white/70">Enterprises</p>
              </div>
              <div>
                <p className="text-[32px] font-extrabold lg:text-[30px]">8.2K</p>
                <p className="mt-1.5 text-base text-white/70">
                  Active Members
                </p>
              </div>
              <div>
                <p className="text-[32px] font-extrabold lg:text-[30px]">$2.4M</p>
                <p className="mt-1.5 text-base text-white/70">
                  Platform GMV
                </p>
              </div>
            </div>

            <p className="absolute bottom-1 left-0 right-0 text-center text-sm text-white/45">
              &copy; 2026 Invigorate Health, Inc.
            </p>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:h-screen lg:min-h-0 lg:px-16 lg:py-8">
          <div className="w-full max-w-[500px]">
            <div>
              <h2 className="text-[32px] font-extrabold tracking-normal text-[#041a16] sm:text-[34px] lg:text-[34px]">
                Welcome back
              </h2>
              <p className="mt-2 text-xl text-[#55746b] lg:text-xl">
                Sign in to your enterprise portal
              </p>
            </div>

            <form className="mt-11 space-y-6 lg:mt-9 lg:space-y-4">
              <label className="block">
                <span className="text-base font-bold text-[#051915]">Email Address</span>
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="mt-3 h-14 w-full rounded-[20px] border border-[#c9ddd7] bg-[#f1f7f4] px-5 text-xl text-[#173b34] outline-none transition placeholder:text-[#8aa19a] focus:border-[#226b58] focus:ring-4 focus:ring-[#226b58]/10 lg:h-[52px] lg:text-lg"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between gap-4">
                  <span className="text-base font-bold text-[#051915]">Password</span>
                  <a href="#" className="text-base font-medium text-[#0b5b4e]">
                    Forgot password?
                  </a>
                </span>
                <span className="relative mt-3 block">
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="h-14 w-full rounded-[20px] border border-[#c9ddd7] bg-[#f1f7f4] px-5 pr-14 text-xl text-[#173b34] outline-none transition placeholder:text-[#8aa19a] focus:border-[#226b58] focus:ring-4 focus:ring-[#226b58]/10 lg:h-[52px] lg:text-lg"
                  />
                  <svg
                    aria-hidden="true"
                    className="absolute right-6 top-1/2 h-6 w-6 -translate-y-1/2 text-[#6b8b83]"
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

              <label className="flex items-center gap-4 text-xl font-medium text-[#58736d] lg:text-lg">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-[#6b736f] accent-[#1d6b58]"
                />
                <span>Keep me signed in</span>
              </label>

              <button
                type="submit"
                className="h-[58px] w-full rounded-[20px] bg-[#1f6a58] text-xl font-bold text-white shadow-[0_6px_10px_rgba(0,0,0,0.18)] transition hover:bg-[#185746] focus:outline-none focus:ring-4 focus:ring-[#226b58]/20 lg:h-[54px] lg:text-lg"
              >
                Sign In to Portal
              </button>
            </form>

            <div className="mt-9 text-center lg:mt-7">
              <p className="text-base text-[#4c7168]">or continue with</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-5">
                <button className="flex h-14 items-center justify-center gap-4 rounded-[18px] border border-[#e1e6e8] bg-white text-xl font-semibold text-[#071d19] transition hover:border-[#cfd8d7] lg:h-[52px] lg:text-lg">
                  <span className="font-bold text-[#4285f4]">G</span>
                  <span>Google</span>
                </button>
                <button className="flex h-14 items-center justify-center gap-4 rounded-[18px] border border-[#e1e6e8] bg-white text-xl font-semibold text-[#071d19] transition hover:border-[#cfd8d7] lg:h-[52px] lg:text-lg">
                  <span className="grid h-5 w-5 grid-cols-2 gap-0.5">
                    <span className="bg-[#f25022]" />
                    <span className="bg-[#7fba00]" />
                    <span className="bg-[#00a4ef]" />
                    <span className="bg-[#ffb900]" />
                  </span>
                  <span>Microsoft</span>
                </button>
              </div>
            </div>

            <p className="mt-10 text-center text-xl text-[#4c7168] lg:mt-7 lg:text-lg">
              New enterprise?{" "}
              <a href="#" className="font-bold text-[#0b5b4e]">
                Request access -&gt;
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
