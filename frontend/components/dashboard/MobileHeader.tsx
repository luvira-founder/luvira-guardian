"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";

export default function MobileHeader() {
  const pathname = usePathname();
  const { toggle } = useSidebar();

  // TestHarness has its own header bar — skip the layout header there
  if (pathname === "/dashboard") return null;

  return (
    <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
      <button
        onClick={toggle}
        className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <Image
        src="/logo.svg"
        alt="Luvira Guardian"
        className="w-7 h-7 max-[450px]:h-5 max-[450px]:w-5"
        width={20}
        height={20}
      />
      <span className="text-[15px] font-semibold text-gray-800">
        Luvira Guardian
      </span>
    </div>
  );
}
