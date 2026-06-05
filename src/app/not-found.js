import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-md place-items-center gap-4 px-4 py-32 text-center">
      <p className="font-display text-6xl font-700 text-beak">404</p>
      <p className="text-ink-400">Уучлаарай, энэ хуудас олдсонгүй.</p>
      <Link href="/" className="btn-accent">Нүүр хуудас руу</Link>
    </div>
  );
}
