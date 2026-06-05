"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Хэрэглэгчийн талын live chat
// session_id-г localStorage-д хадгална, supabase realtime-ээр шинэ мессеж ирэх үед автоматаар харагдана
const SESSION_KEY = "huurhun_chat_session";

export default function LiveChatPage() {
  const supabase = createClient();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [ready, setReady] = useState(false);
  const scrollRef = useRef(null);

  // session байгаа эсэхийг шалгах
  useEffect(() => {
    const id = localStorage.getItem(SESSION_KEY);
    if (id) {
      supabase.from("chat_sessions").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setSession(data);
          loadMessages(data.id);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  // Realtime — шинэ мессеж ирэхэд автоматаар сонсож, харуулна
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`chat:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  // Шинэ мессеж ирэхэд хамгийн доош автомат гүйлгэнэ
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function loadMessages(sid) {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    // Хэрэглэгчийн уншаагүйг 0 болго
    await supabase.from("chat_sessions").update({ unread_by_user: 0 }).eq("id", sid);
  }

  async function startChat() {
    if (!form.name) return alert("Нэрээ оруулна уу");
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_name: form.name,
        user_email: form.email || null,
        user_phone: form.phone || null,
      })
      .select()
      .single();
    if (error) return alert(error.message);
    localStorage.setItem(SESSION_KEY, data.id);
    setSession(data);
    // Анхны мэндчилгээ — бот биш, тогтсон мессеж
    await supabase.from("chat_messages").insert({
      session_id: data.id,
      sender: "admin",
      content: `Сайн байна уу, ${form.name}! 🦆\n\nhuurhun_clothes-д тавтай морилно уу. Мессежээ үлдээгээрэй, манай ажилтан удахгүй хариу өгнө.`,
    });
    await supabase.from("chat_sessions").update({ unread_by_admin: 1 }).eq("id", data.id);
    loadMessages(data.id);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !session) return;
    setInput("");
    await supabase.from("chat_messages").insert({
      session_id: session.id,
      sender: "user",
      content: text,
    });
    // Админд unread нэмэх
    await supabase
      .from("chat_sessions")
      .update({
        last_message_at: new Date().toISOString(),
        unread_by_admin: (session.unread_by_admin || 0) + 1,
      })
      .eq("id", session.id);
  }

  function endSession() {
    if (confirm("Чатыг хаах уу?")) {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
      setMessages([]);
      setForm({ name: "", email: "", phone: "" });
    }
  }

  if (!ready) return null;

  // ===== Эхлэх форм =====
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="card p-8">
          <h1 className="font-display text-2xl font-700">💬 Шууд чат</h1>
          <p className="mt-1 text-sm text-ink-400">
            Манай ажилтантай шууд чатлаж асуултын хариу аваарай.
          </p>
          <div className="mt-6 space-y-3">
            <input
              className="input"
              placeholder="Нэр *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Имэйл (заавал биш)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="input"
              placeholder="Утас (заавал биш)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <button onClick={startChat} className="btn-accent w-full">Чат эхлүүлэх</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Чат =====
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between bg-ink p-4 text-cream">
          <div>
            <p className="font-semibold">🦆 huurhun_clothes</p>
            <p className="text-xs opacity-70">Шууд чат · {session.user_name}</p>
          </div>
          <button onClick={endSession} className="text-xs underline opacity-70 hover:opacity-100">Хаах</button>
        </div>

        <div ref={scrollRef} className="h-[60vh] overflow-y-auto bg-paper p-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.sender === "user"
                    ? "bg-ink text-cream rounded-br-sm"
                    : "bg-beak-100 text-ink rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-sm text-ink-400">Мессеж байхгүй...</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-ink/10 p-3">
          <input
            className="input flex-1"
            placeholder="Мессеж бичих..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} className="btn-primary">Илгээх</button>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-ink-400">
        Ажилтан үг хариулахдаа хэдэн минут сунгаж магадгүй
      </p>
    </div>
  );
}
