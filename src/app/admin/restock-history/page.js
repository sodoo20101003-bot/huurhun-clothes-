"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RestockHistoryPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("restock_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  // Огноогоор бүлэглэх
  const byDay = {};
  for (const log of logs) {
    const d = new Date(log.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(log);
  }
  const dayKeys = Object.keys(byDay).sort().reverse();

  const totalQty = logs.reduce((s, l) => s + Number(l.qty || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-700">📥 Ачаа орох түүх</h2>
        <div className="text-sm text-ink-400">
          Нийт: <b className="text-ink">{logs.length}</b> бүртгэл · <b className="text-green-600">{totalQty}</b> ширхэг
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="card p-10 text-center text-ink-400">
          <div className="text-4xl mb-2">📦</div>
          <p>Ачаа орох бүртгэл байхгүй байна</p>
          <p className="text-xs mt-2">Барааны хуудаснаас "📥 Ачаа" товч дарж нэмнэ үү</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayKeys.map((day) => {
            const dayLogs = byDay[day];
            const dayTotal = dayLogs.reduce((s, l) => s + Number(l.qty || 0), 0);
            return (
              <div key={day} className="card p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-ink/10">
                  <p className="font-display font-700">{day}</p>
                  <p className="text-sm text-ink-400">
                    <b className="text-green-600">{dayTotal}</b> ширхэг · {dayLogs.length} бүртгэл
                  </p>
                </div>
                <div className="space-y-2">
                  {dayLogs.map((log) => {
                    const d = new Date(log.created_at);
                    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    return (
                      <div key={log.id} className="flex items-center gap-3 rounded-lg bg-cream/50 p-3 text-sm">
                        <span className="text-xs text-ink-400 w-12 font-mono">{time}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{log.product_name}</p>
                          <p className="text-xs text-ink-400">
                            {[log.size, log.color].filter(Boolean).join(" / ") || "—"}
                            {log.note && ` · 📝 ${log.note}`}
                          </p>
                        </div>
                        <span className="rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm font-bold">
                          +{log.qty} ширхэг
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
