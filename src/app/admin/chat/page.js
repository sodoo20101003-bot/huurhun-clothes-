"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";

export default function AdminChatPage() {
  const supabase = createClient();
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  // Session-уудыг ачаалах + realtime сонсох
  useEffect(() => {
    loadSessions();
    const channel = supabase
      .channel("admin-chat-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, () => loadSessions())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        loadSessions();
        if (active && payload.new.session_id === active.id) {
          setMessages((prev) => [...prev, payload.new]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  async function loadSessions() {
    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(50);
    setSessions(data || []);
  }

  async function openSession(s) {
    setActive(s);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", s.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Хэрэв админ энэ session-д нэг ч мэссеж бичээгүй бол автомат мэндчилгээ
    const adminHasReplied = (data || []).some((m) => m.sender === "admin" && !m.content.includes("туслах бот"));
    if (!adminHasReplied) {
      await supabase.from("chat_messages").insert({
        session_id: s.id,
        sender: "admin",
        content: `Сайн байна уу${s.user_name ? `, ${s.user_name}` : ""}! 🦆 huurhun_clothes-ийн админ холбогдлоо. Тандаа юугаар туслах вэ?`,
      });
      await supabase
        .from("chat_sessions")
        .update({ unread_by_user: (s.unread_by_user || 0) + 1 })
        .eq("id", s.id);
    }

    // Унш гэж тэмдэглэх
    await supabase.from("chat_sessions").update({ unread_by_admin: 0 }).eq("id", s.id);
    loadSessions();
  }

  async function sendReply() {
    const text = input.trim();
    if (!text || !active) return;
    setInput("");
    await supabase.from("chat_messages").insert({
      session_id: active.id,
      sender: "admin",
      content: text,
    });
    await supabase
      .from("chat_sessions")
      .update({
        last_message_at: new Date().toISOString(),
        unread_by_user: (active.unread_by_user || 0) + 1,
      })
      .eq("id", active.id);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3 h-[70vh]">
      {/* === Session жагсаалт === */}
      <div className="card p-2 overflow-y-auto">
        <p className="px-2 py-2 text-xs font-semibold text-ink-400">
          💬 Чатууд ({sessions.length})
        </p>
        <div className="space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSession(s)}
              className={`w-full rounded-lg p-2 text-left text-sm transition ${
                active?.id === s.id ? "bg-beak-100" : "hover:bg-cream"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold truncate">{s.user_name || "—"}</p>
                {s.unread_by_admin > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-beak px-1.5 text-xs font-bold text-ink">
                    {s.unread_by_admin}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-400 truncate">{s.user_email || s.user_phone || "Хаяггүй"}</p>
              <p className="text-[10px] text-ink-400">{timeAgo(s.last_message_at)}</p>
            </button>
          ))}
          {sessions.length === 0 && <p className="p-4 text-sm text-ink-400">Чат алга</p>}
        </div>
      </div>

      {/* === Чат === */}
      <div className="card overflow-hidden flex flex-col">
        {active ? (
          <>
            <div className="border-b border-ink/10 p-3">
              <p className="font-semibold">{active.user_name}</p>
              <p className="text-xs text-ink-400">
                {[active.user_email, active.user_phone].filter(Boolean).join(" · ") || "Хаяггүй"}
              </p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-paper p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                      m.sender === "admin"
                        ? "bg-ink text-cream rounded-br-sm"
                        : "bg-beak-100 text-ink rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-ink/10 p-3">
              <input
                className="input flex-1"
                placeholder="Хариу бичих..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
              />
              <button onClick={sendReply} className="btn-primary">Илгээх</button>
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center text-ink-400">
            <p>← Зүүн талаас чат сонгоно уу</p>
          </div>
        )}
      </div>
    </div>
  );
}
