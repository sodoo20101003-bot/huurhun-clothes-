"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const WELCOME = {
  from: "bot",
  text: "Сайн байна уу! 🦆 huurhun_clothes-ийн туслах бот байна.\n\nЯмар тусламж хэрэгтэй вэ? Доорх сонголтоос нэгийг даран эсвэл өөрийн асуултаа бичээрэй.",
  quickReplies: ["📦 Захиалга шалгах", "📞 Утасны дугаар", "📍 Хаяг хаана вэ?", "💬 Админтай чатлах"],
};

export default function ChatBot() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingForCode, setWaitingForCode] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addBotMessage(text, quickReplies = null) {
    setMessages((m) => [...m, { from: "bot", text, quickReplies }]);
  }

  function addUserMessage(text) {
    setMessages((m) => [...m, { from: "user", text }]);
  }

  async function checkCode(code) {
    setLoading(true);
    try {
      const res = await fetch("/api/order/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      addBotMessage(data.message || "Энэ кодтой захиалга олдсонгүй.", [
        "📦 Өөр код шалгах",
        "🏠 Эхэнд буцах",
      ]);
    } catch (_) {
      addBotMessage("Уучлаарай, техникийн алдаа гарлаа. Дахин оролдоно уу.", ["🏠 Эхэнд буцах"]);
    }
    setLoading(false);
    setWaitingForCode(false);
  }

  function handleQuickReply(reply) {
    addUserMessage(reply);

    if (reply === "📦 Захиалга шалгах" || reply === "📦 Өөр код шалгах") {
      addBotMessage(
        "6 оронтой захиалгын кодоо бичнэ үү 🔢\n\nЖишээ: 482917\n\nКодоо захиалга өгөхдөө авсан байх ёстой.",
        null
      );
      setWaitingForCode(true);
    } else if (reply === "📞 Утасны дугаар") {
      addBotMessage(
        "📞 Бидэнтэй холбогдох:\n\n+976 8522 9940\n\nАжлын цаг: Даваа–Бямба, 10:00–20:00",
        ["🏠 Эхэнд буцах", "💬 Админтай чатлах"]
      );
    } else if (reply === "📍 Хаяг хаана вэ?") {
      addBotMessage(
        "📍 Манай 2 салбар:\n\n🏪 Салбар 1 — Google Maps дээр харах\n🏪 Салбар 2 — Google Maps дээр харах\n\nХүргэлт: Улаанбаатар хотын дотор 7,000₮.",
        ["🏠 Эхэнд буцах", "📞 Утасны дугаар"]
      );
    } else if (reply === "💬 Админтай чатлах") {
      addBotMessage(
        "Манай админтай шууд чатлахаар явуулъя 👇\n\nДоорх товчоор шилжээд нэр оруулахад админ танд бодит цагт хариу өгнө!"
      );
      // 1 секундын дараа livechat руу шилжих
      setTimeout(() => {
        window.location.href = "/livechat";
      }, 1500);
    } else if (reply === "🏠 Эхэнд буцах") {
      setMessages([WELCOME]);
      setWaitingForCode(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    addUserMessage(text);

    // Хэрэв 6 оронтой код хүлээж байгаа бол шалгах
    const codeMatch = text.match(/\d{6}/);
    if (codeMatch) {
      await checkCode(codeMatch[0]);
      return;
    }

    // Бусад үед — quick reply санал болгох
    addBotMessage(
      "Ойлгомжтой биш байна 😅 Доорх сонголтоос нэгийг сонгоно уу:",
      ["📦 Захиалга шалгах", "📞 Утасны дугаар", "📍 Хаяг хаана вэ?", "💬 Админтай чатлах"]
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-180px)] max-w-2xl flex-col px-4 py-6">
      {/* HEADER */}
      <div className="flex items-center gap-3 border-b border-ink/10 pb-4">
        <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-ink">
          <Image src="/logo.jpg" alt="huurhun_clothes" width={48} height={48} className="object-cover" />
        </div>
        <div>
          <h1 className="font-display text-lg font-700">huurhun_clothes Туслах</h1>
          <p className="text-xs text-green-600">● Онлайн</p>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                  m.from === "user"
                    ? "bg-ink text-cream rounded-br-md"
                    : "bg-paper border border-ink/10 shadow-card rounded-bl-md"
                }`}
              >
                {m.text}
              </div>
            </div>
            {/* Quick reply товчнууд */}
            {m.from === "bot" && m.quickReplies && i === messages.length - 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.quickReplies.map((qr) => (
                  <button
                    key={qr}
                    onClick={() => handleQuickReply(qr)}
                    className="rounded-full border border-beak/30 bg-beak-100 px-4 py-2 text-sm font-semibold text-beak-600 hover:bg-beak/20 transition"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-paper border border-ink/10 shadow-card px-4 py-3 text-sm text-ink-400">
              Шалгаж байна...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* INPUT */}
      <div className="flex gap-2 border-t border-ink/10 pt-4">
        <input
          className="input flex-1"
          placeholder={waitingForCode ? "6 оронтой кодоо бичнэ үү..." : "Асуултаа бичих..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} disabled={loading} className="btn-primary !px-6">
          Илгээх
        </button>
      </div>
    </div>
  );
}
