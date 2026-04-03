import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import LoginButton from "@/components/LoginButton";

export default async function Home() {
  const session = await auth0.getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#060812] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 md:w-225 h-75 md:h-112.5 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-100 md:w-150 h-50 md:h-75 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm md:max-w-md">
        <div className="bg-white/4 backdrop-blur-2xl border border-white/8 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
          <div className="h-px bg-linear-to-r from-transparent via-blue-500/60 to-transparent" />

          <div className="px-8 md:px-10 pt-9 md:pt-10 pb-9 md:pb-10 flex flex-col items-center gap-6 md:gap-7">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>

            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-semibold text-white tracking-[-0.02em]">
                Luvira Guardian
              </h1>
              <p className="text-slate-400 text-sm md:text-[15px] mt-1.5">
                Secure AI Incident Response Agent
              </p>
              <p className="text-slate-600 text-xs mt-1">
                Powered by Auth0 Token Vault
              </p>
            </div>

            <div className="w-full h-px bg-white/6" />

            <div className="flex flex-col items-center gap-5 w-full">
              <p className="text-slate-400 text-sm md:text-[15px] text-center leading-relaxed tracking-[-0.01em]">
                Sign in to access the secure incident response console.
              </p>
              <LoginButton />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
