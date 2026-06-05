"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPromotions() {
  const supabase = createClient();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", badge: "1+1", image: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
    setList(data || []);
  }
  useEffect(() => { load(); }, []);

  async function uploadImg(file) {
    const path = `promotions/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("products").upload(path, file);
    if (error) return alert(error.message);
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    setForm((f) => ({ ...f, image: data.publicUrl }));
  }

  async function add() {
    if (!form.title) return alert("Гарчгаа бичнэ үү");
    setBusy(true);
    await supabase.from("promotions").insert({ ...form, active: true });
    setForm({ title: "", description: "", badge: "1+1", image: "" });
    await load();
    setBusy(false);
  }
  async function toggle(p) {
    await supabase.from("promotions").update({ active: !p.active }).eq("id", p.id);
    await load();
  }
  async function remove(id) {
    if (!confirm("Устгах уу?")) return;
    await supabase.from("promotions").delete().eq("id", id);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <h2 className="font-display font-600">Шинэ урамшуулал</h2>
        <p className="text-sm text-ink-400">
          Ж: <b>"1 загвар + цүнх"</b>, <b>"1+1"</b>, <b>"Дагалдан бараа"</b>, <b>"Үнэгүй хүргэлт"</b>
        </p>

        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <input className="input" placeholder="Тэмдэг (ж: 1+1)" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
          <input className="input" placeholder="Гарчиг (ж: 1 загвар + цүнх)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <textarea
          className="input min-h-20"
          placeholder="Тайлбар (ж: New Balance 530 загвар авбал цүнх бэлэглэнэ)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        {/* Зураг */}
        <div>
          <p className="text-sm font-semibold mb-2">Зураг (заавал биш)</p>
          <div className="flex items-center gap-3">
            {form.image ? (
              <div className="relative group">
                <img src={form.image} alt="" className="h-28 w-28 rounded-xl object-cover" />
                <button
                  onClick={() => setForm({ ...form, image: "" })}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs text-white"
                >×</button>
              </div>
            ) : (
              <label className="grid h-28 w-28 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-ink/30 hover:border-beak hover:text-beak transition">
                <div className="text-center">
                  <span className="text-2xl block">+</span>
                  <span className="text-xs">Зураг</span>
                </div>
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && uploadImg(e.target.files[0])} />
              </label>
            )}
          </div>
        </div>

        <button onClick={add} disabled={busy} className="btn-accent">
          {busy ? "Хадгалж байна..." : "Нэмэх"}
        </button>
      </div>

      <div className="card divide-y divide-ink/5 p-2">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            {p.image ? (
              <img src={p.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-beak-100 font-display text-sm font-700 text-beak-600">{p.badge}</span>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.title}</p>
              <p className="text-xs text-ink-400 line-clamp-1">{p.description}</p>
            </div>
            <button onClick={() => toggle(p)} className={`chip ${p.active ? "border-green-500 text-green-700" : "border-ink/20 text-ink-400"}`}>
              {p.active ? "Идэвхтэй" : "Идэвхгүй"}
            </button>
            <button onClick={() => remove(p.id)} className="text-sm text-red-500 hover:underline">Устгах</button>
          </div>
        ))}
        {list.length === 0 && <p className="p-4 text-sm text-ink-400">Урамшуулал алга.</p>}
      </div>
    </div>
  );
}
