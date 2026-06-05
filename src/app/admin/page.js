import { createClient } from "@/lib/supabase/server";
import { formatPrice, timeAgo } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();

  // Хугацаа: эхнээс өнөөдрийн 7 хоног, 30 хоног
  const now = new Date();
  const last7d = new Date(now.getTime() - 7 * 86400000).toISOString();
  const last30d = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    { count: productsCount },
    { count: ordersCount },
    { count: paidCount },
    { count: pendingCount },
    { count: shippedCount },
    { data: allPaidOrders },
    { data: orders7d },
    { data: orders30d },
    { data: recent },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("payment_status", "paid"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("payment_status", "pending"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "shipped"),
    supabase.from("orders").select("total,items,created_at").eq("payment_status", "paid"),
    supabase.from("orders").select("total").eq("payment_status", "paid").gte("created_at", last7d),
    supabase.from("orders").select("total").eq("payment_status", "paid").gte("created_at", last30d),
    supabase.from("orders").select("order_code,customer_name,total,payment_status,created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  // Орлого тооцоо
  const totalRevenue = (allPaidOrders || []).reduce((s, o) => s + Number(o.total || 0), 0);
  const revenue7d = (orders7d || []).reduce((s, o) => s + Number(o.total || 0), 0);
  const revenue30d = (orders30d || []).reduce((s, o) => s + Number(o.total || 0), 0);

  // Зарагдсан барааны статистик
  const productSales = {}; // { name: { qty, revenue } }
  for (const o of allPaidOrders || []) {
    for (const it of (o.items || [])) {
      const key = it.name || "Тодорхойгүй";
      if (!productSales[key]) productSales[key] = { qty: 0, revenue: 0 };
      productSales[key].qty += Number(it.qty || 0);
      productSales[key].revenue += Number(it.qty || 0) * Number(it.unitPrice || 0);
    }
  }
  const topProducts = Object.entries(productSales)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* === НИЙТ СТАТИСТИК === */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-5 bg-ink text-cream">
          <p className="text-xs text-cream/60">💰 Нийт орлого</p>
          <p className="mt-1 font-display text-2xl font-700">{formatPrice(totalRevenue)}</p>
          <p className="mt-1 text-xs text-cream/50">{paidCount || 0} төлсөн захиалга</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-400">📅 7 хоног</p>
          <p className="mt-1 font-display text-2xl font-700 text-beak-600">{formatPrice(revenue7d)}</p>
          <p className="mt-1 text-xs text-ink-400">сүүлийн долоо хоног</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-400">📆 30 хоног</p>
          <p className="mt-1 font-display text-2xl font-700 text-beak-600">{formatPrice(revenue30d)}</p>
          <p className="mt-1 text-xs text-ink-400">сүүлийн сар</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-400">📦 Хүргэгдсэн</p>
          <p className="mt-1 font-display text-2xl font-700 text-green-600">{shippedCount || 0}</p>
          <p className="mt-1 text-xs text-ink-400">амжилттай</p>
        </div>
      </div>

      {/* === ТОО === */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-ink-400">Нийт бараа</p>
          <p className="mt-1 font-display text-2xl font-700">{productsCount || 0}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-ink-400">Нийт захиалга</p>
          <p className="mt-1 font-display text-2xl font-700">{ordersCount || 0}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-ink-400">⏳ Хүлээгдэж буй</p>
          <p className="mt-1 font-display text-2xl font-700 text-beak-600">{pendingCount || 0}</p>
        </div>
      </div>

      {/* === ТОП ЗАРАГДСАН БАРАА === */}
      {topProducts.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-600">🏆 Хамгийн их зарагдсан бараа</h2>
          <div className="mt-4 space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-700 ${
                  i === 0 ? "bg-beak text-ink" : i < 3 ? "bg-beak-100 text-beak-600" : "bg-cream text-ink-400"
                }`}>
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-semibold">{p.name}</span>
                <span className="text-xs text-ink-400">{p.qty} ширхэг</span>
                <span className="font-display font-600 text-sm">{formatPrice(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === СҮҮЛИЙН ЗАХИАЛГУУД === */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-600">Сүүлийн захиалгууд</h2>
          <Link href="/admin/orders" className="text-sm text-beak-600 hover:underline">Бүгдийг харах →</Link>
        </div>
        <div className="mt-3 divide-y divide-ink/5">
          {(recent || []).map((o) => (
            <Link key={o.order_code} href="/admin/orders" className="flex items-center gap-3 py-3 text-sm hover:text-beak-600">
              <span className="font-mono font-semibold">#{o.order_code}</span>
              <span className="text-ink-400 hidden sm:inline">{o.customer_name}</span>
              <span className="text-xs text-ink-400">⏱ {timeAgo(o.created_at)}</span>
              <span className="ml-auto font-display font-600">{formatPrice(o.total)}</span>
              <span className={`chip text-xs ${o.payment_status === "paid" ? "border-green-500 text-green-700" : "border-beak text-beak-600"}`}>
                {o.payment_status === "paid" ? "✓" : "⏳"}
              </span>
            </Link>
          ))}
          {(!recent || recent.length === 0) && <p className="py-4 text-sm text-ink-400">Захиалга алга.</p>}
        </div>
      </div>
    </div>
  );
}
