import AuditLogs from "@/components/logs/audit-logs";
import { auth0 } from "@/lib/auth0";
import { AUDIT_ENTRIES } from "@/lib/constants";

export default async function AuditLogPage() {
  const token = await auth0.getAccessToken();
  console.log(token);

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Audit Log
        </h1>
        <p className="text-gray-500 text-sm mt-1.5">
          A complete record of all actions taken by Luvira Guardian on your
          behalf.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto] gap-4 px-5 py-3 border-b border-gray-100">
          {["Action", "Service", "Actor", "Timestamp", "Status", "Step-Up"].map(
            (h) => (
              <span
                key={h}
                className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider"
              >
                {h}
              </span>
            ),
          )}
        </div>

        {/* Table rows */}
        <AuditLogs />
      </div>

      <p className="text-[12px] text-gray-400 mt-4">
        {AUDIT_ENTRIES.length} entries · All times in UTC
      </p>
    </div>
  );
}
