import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, ORDER_STATUS } from "@/lib/utils";
import SignOut from "./SignOut";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: orders } = await supabase
    .from("orders")
    .select("order_code,total,status,payment_status,created_at,items")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-700">Миний профайл</h1>
          <p className="mt-1 text-ink-400">{user.email}</p>
        </div>
        <SignOut />
      </div>

      <h2 className="mt-10 font-display text-xl font-600">Миний захиалгууд</h2>
      <div className="mt-4 space-y-3">
        {(orders || []).map((o) => (
          <Link key={o.order_code} href={`/order/${o.order_code}`} className="card block p-5 transition hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="font-display font-600 tracking-wider">#{o.order_code}</span>
              <span className={`chip ${o.payment_status === "paid" ? "border-green-500 text-green-700" : "border-beak text-beak-600"}`}>
                {o.payment_status === "paid" ? "Төлсөн" : "Хүлээгдэж буй"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-ink-400">
              <span>
                {new Date(o.created_at).toLocaleDateString("mn-MN")} · {o.items?.length || 0} төрөл · {ORDER_STATUS[o.status] || o.status}
              </span>
              <span className="font-semibold text-ink">{formatPrice(o.total)}</span>
            </div>
          </Link>
        ))}
        {(!orders || orders.length === 0) && (
          <div className="card grid place-items-center gap-3 py-16 text-center">
            <p className="text-ink-400">Та одоогоор захиалга хийгээгүй байна.</p>
            <Link href="/" className="btn-accent">Дэлгүүр үзэх</Link>
          </div>
        )}
      </div>
    </div>
  );
}
