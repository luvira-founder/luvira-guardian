"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import { Service, User } from "@/types";
import ServiceCard from "./service-card";
import { INITIAL_SERVICES } from "@/lib/constants";
import { formatDateTime } from "@/lib/helpers";
import AgentConsole from "./agent-console";
import { Button } from "../ui/button";
import { checkServicesConnectionStatus } from "@/services/api";
import { useServiceConnect } from "@/hooks/useServiceConnect";
import { useDisconnectService } from "@/services/mutations";
import { getMyAccountToken } from "@/lib/getMyAccountToken";
import { useSidebar } from "./SidebarContext";

interface TestHarnessProps {
  user: User;
  accessToken: string | null;
  jwtClaims: string;
}

export default function TestHarness({
  user,
  accessToken,
  jwtClaims,
}: TestHarnessProps) {
  const [dateTime, setDateTime] = useState<string>(() =>
    formatDateTime(new Date()),
  );
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [connecting, setConnecting] = useState<Set<string>>(new Set());
  const { connect } = useServiceConnect();
  const { mutateAsync: disconnectServiceMutation } = useDisconnectService();
  const { toggle: toggleSidebar } = useSidebar();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setDateTime(formatDateTime(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const applyStatuses = (
    statuses: import("@/services/types").TServiceStatus[],
  ) => {
    setServices((prev) =>
      prev.map((s) => {
        const match = statuses.find((st) => st.service === s.name);
        if (!match) return s;
        const scopes =
          match.granted_scopes.length > 0 ? match.granted_scopes : s.scopes;
        return { ...s, status: match.state, scopes, scope: scopes.join(", ") };
      }),
    );
  };

  const handleConnect = async (id: string) => {
    setConnecting((prev) => new Set(prev).add(id));
    try {
      const service = services.find((s) => s.id === id);
      if (!service) return;
      await connect(
        service.connection as import("@/services/types").TConnection,
        service.scopes,
        applyStatuses,
      );
    } catch (error) {
      console.error(`Failed to connect ${id}:`, error);
    } finally {
      setConnecting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDisconnect = async (id: string) => {
    setConnecting((prev) => new Set(prev).add(id));
    try {
      const service = services.find((s) => s.id === id);
      if (!service) return;
      const ma_token = await getMyAccountToken();
      if (!ma_token) return;
      await disconnectServiceMutation({
        connection:
          service.connection as import("@/services/types").TConnection,
        ma_token,
      });
      const { services: statuses } = await checkServicesConnectionStatus();
      applyStatuses(statuses);
    } catch (error) {
      console.error(`Failed to disconnect ${id}:`, error);
    } finally {
      setConnecting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const [checkingServices, setCheckingServices] = useState(false);

  const handleCheckServices = async () => {
    setCheckingServices(true);
    try {
      const { services: statuses } = await checkServicesConnectionStatus();
      applyStatuses(statuses);
    } catch (error) {
      console.error("Failed to check services:", error);
    } finally {
      setCheckingServices(false);
    }
  };

  async function handleCopyToken() {
    if (!accessToken) return;
    await navigator.clipboard.writeText(accessToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const firstName = user.name?.split(" ")[0] ?? "User";

  return (
    <div className="flex flex-col h-full">
      {/*  App bar  */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={toggleSidebar}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
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
            width={28}
            height={28}
            className="md:hidden"
          />
          <span className="hidden text-[15px] font-semibold text-gray-800 sm:inline">
            Luvira Guardian Test Harness
          </span>
          <span className="text-[15px] font-semibold text-gray-800 sm:hidden">
            Luvira Guardian
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Bell */}
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors relative">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          </button>
          {/* User */}
          <div className="flex items-center gap-2.5">
            {user.picture ? (
              <Image
                src={user.picture}
                alt={user.name ?? "User"}
                className="w-8 h-8 rounded-full"
                width={32}
                height={32}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#3bcaca]/20 flex items-center justify-center text-[#3bcaca] text-sm font-semibold">
                {firstName[0]}
              </div>
            )}
            <div className="leading-tight hidden md:block">
              <p className="text-[10px] text-gray-400">Logged in as</p>
              <p className="text-[13px] font-medium text-gray-700">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5 max-[450px]:px-2">
        {/* Greeting row */}
        <div className="flex items-center justify-between max-[360px]:flex-col max-[360px]:space-y-2">
          <h1 className="text-[24px] font-bold text-gray-900 max-[450px]:text-xl">
            Hello, {firstName}!
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-600 tabular-nums max-[768px]:hidden">
              {dateTime}
            </span>
            <button
              onClick={handleCopyToken}
              disabled={!accessToken}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-600 bg-gray-200 border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors max-[450px]:text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3.5 h-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                />
              </svg>
              {copied ? "Copied!" : "Copy Token"}
            </button>
            <Button
              asChild
              variant="destructive"
              className="px-4 py-1.5 text-[13px] font-semibold rounded-sm transition-colors max-[450px]:text-xs"
            >
              <Link href="/auth/logout">Sign Out</Link>
            </Button>
          </div>
        </div>

        {/* JWT Claims + Connected Services */}
        <div className="flex flex-col gap-4 xl:flex-row">
          {/* JWT Claims */}
          <div className="w-full shrink-0 bg-white border border-gray-200 rounded-md p-5 flex flex-col gap-3 xl:w-[40%]">
            <h2 className="text-[15px] font-semibold text-gray-800">
              JWT Claims
            </h2>
            <div
              className="bg-gray-50 border border-gray-200 rounded-md p-4 flex-1 overflow-auto"
              style={{ maxHeight: 260 }}
            >
              <pre className="text-[12px] text-gray-500 font-mono leading-relaxed whitespace-pre-wrap break-all">
                {jwtClaims}
              </pre>
            </div>
          </div>

          {/* Connected Services */}
          <div className="flex-1 bg-white border border-gray-200 rounded-md p-5 flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-gray-800">
              Connected Services
            </h2>
            <div className="flex gap-3 flex-1 max-[600px]:grid max-[600]:grid-cols-2 max-[450px]:grid-cols-1">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  connecting={connecting.has(service.id)}
                />
              ))}
            </div>
            <button
              onClick={handleCheckServices}
              disabled={checkingServices}
              className="w-full py-3 bg-[#3bcaca] text-white text-[14px] font-semibold rounded-sm hover:bg-[#2db8b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingServices ? "Checking…" : "Check Services"}
            </button>
          </div>
        </div>

        {/* Agent Console */}
        <AgentConsole />

        {/* Version */}
        <p className="text-[11px] text-gray-400">1.121.1</p>
      </div>
    </div>
  );
}
