#!/bin/bash
set -e

FILE="src/app/admin/products/page.js"

if [ ! -f "$FILE" ]; then
  echo "❌ Файл олдсонгүй. ~/Downloads/mongol-shop-fresh дотор ажиллуулна уу."
  exit 1
fi

echo "🔧 Products page засаж байна..."

# 1. Backup хийх (одоогийн)
cp "$FILE" "$FILE.before-fix-$(date +%s)"

# 2. Хамгийн эрт backup сэргээх (цэвэр эхлэлээс эхлэх)
if [ -f "$FILE.backup2" ]; then
  cp "$FILE.backup2" "$FILE"
  echo "  ✅ backup2-оос сэргээгдэв"
elif [ -f "$FILE.backup" ]; then
  cp "$FILE.backup" "$FILE"
  echo "  ✅ backup-с сэргээгдэв"
fi

# 3. Python-ээр 4 засвар нэг дор
python3 << 'PYEOF'
import re

with open('src/app/admin/products/page.js', 'r') as f:
    content = f.read()

# ЗАСВАР 1: Ачаа товч устгах (📥 emoji-той)
# 📥 гэсэн эхлэлтэй button блокыг олж устгах
content = re.sub(
    r'<button[^>]*onClick[^>]*openRestock[^>]*>[\s\S]*?</button>',
    '',
    content
)
# Мөн openRestock function-ыг ч устгах хэрэггүй — зөвхөн UI-с товч л устгана

# ЗАСВАР 2: Save mutation-т cost_price нэмэх
content = re.sub(
    r'price: Number\(form\.price\), discount_percent',
    'price: Number(form.price), cost_price: Number(form.cost_price) || 0, discount_percent',
    content
)

# ЗАСВАР 3: Form edit initial state-т cost_price нэмэх
content = re.sub(
    r'(price: p\.price\?\.toString\(\) \|\| "",)',
    r'\1\n      cost_price: p.cost_price?.toString() || "",',
    content
)

# ЗАСВАР 4: Default form state-т cost_price нэмэх
content = re.sub(
    r'(\s+)price: "",(\s+)discount_percent',
    r'\1price: "",\1cost_price: "",\2discount_percent',
    content
)

# ЗАСВАР 5: Price input-ий дараа cost_price input UI нэмэх
old = '<input className="input" type="number" placeholder="Үнэ (₮)" value={form.price} onChange={(e) => set("price", e.target.value)} />'
new = old + '\n              <label className="mb-1 mt-3 block text-sm font-semibold">💰 Үндсэн үнэ (өртөг)</label>\n              <input className="input" type="number" placeholder="ж: 100000" value={form.cost_price || ""} onChange={(e) => set("cost_price", e.target.value)} />'
content = content.replace(old, new)

with open('src/app/admin/products/page.js', 'w') as f:
    f.write(content)

print("  ✅ Python засварууд амжилттай")
PYEOF

echo ""
echo "🔍 Шалгах:"
echo ""
echo "  cost_price мөр (3-4 байх ёстой):"
grep -c "cost_price" "$FILE" || echo "  ⚠️ cost_price олдсонгүй"

echo ""
echo "  📥 Ачаа товч байгаа эсэх (0 байх ёстой):"
grep -c "📥" "$FILE" || echo "  0"

echo ""
echo "  Үндсэн үнэ label:"
grep -c "Үндсэн үнэ" "$FILE" || echo "  0"

echo ""
echo "✅ Дууссан!"
echo ""
echo "Одоо push хийх:"
echo "  git add ."
echo "  git commit -m 'Products: add cost_price + remove Achaa button'"
echo "  git push"
