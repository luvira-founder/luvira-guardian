import { Service } from "@/types";
import Image from "next/image";

export default function ServiceCard({
  service,
  onConnect,
  onDisconnect,
  connecting,
}: {
  service: Service;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  connecting?: boolean;
}) {
  const isConnected = service.status === "connected";

  return (
    <div className="flex-1 min-w-0 min-h-64 bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col items-center gap-3">
      <div className="flex flex-1 space-y-3 flex-col items-center">
        <Image
          src={service.logo}
          alt={`${service.name} logo`}
          width={service.logoWidth}
          height={service.logoHeight}
        />
        <p className="text-[14px] font-semibold text-gray-800 text-center">
          {service.name}
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center space-y-2">
        {service.scopes.length > 0 && (
          <p className="text-[10px] text-gray-400 text-center leading-snug break-all">
            {service.scopes.join(", ")}
          </p>
        )}
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ${
            isConnected
              ? "bg-[#3bcaca]/10 text-[#3bcaca]"
              : "bg-red-100 text-red-400"
          }`}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <button
        onClick={() =>
          isConnected ? onDisconnect(service.id) : onConnect(service.id)
        }
        disabled={connecting}
        className={`w-full py-1.5 rounded-sm text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isConnected
            ? "border border-gray-300 text-gray-500 bg-white hover:bg-gray-50"
            : "bg-[#3bcaca] text-white hover:bg-[#2db8b8]"
        }`}
      >
        {connecting ? "Connecting…" : service.connectLabel}
      </button>
    </div>
  );
}
