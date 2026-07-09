#!/usr/bin/env python3
"""
Products page-ийг цэвэрлэж засах script.
Аюулгүй — олон удаа ажиллуулж болно (idempotent).

Дараах засваруудыг хийнэ:
1. Backup сэргээх (backup2)
2. 📥 Ачаа товч устгах
3. Form state-т cost_price нэмэх
4. Save mutation-т cost_price нэмэх
5. Barаанын нэр input-ий ард label нэмэх
6. Үнэ input-ий ард label нэмэх
7. Үнэ input-ий доор Үндсэн үнэ input нэмэх
"""

import re
import shutil
import os
import time

FILE = "src/app/admin/products/page.js"

if not os.path.exists(FILE):
    print(f"❌ Файл олдсонгүй: {FILE}")
    exit(1)

# 1. Backup
timestamp = int(time.time())
shutil.copy(FILE, f"{FILE}.pre-clean-{timestamp}")

# 2. Backup2 сэргээх (хэрэв байгаа бол)
if os.path.exists(f"{FILE}.backup2"):
    shutil.copy(f"{FILE}.backup2", FILE)
    print("✅ backup2-с цэвэр эхэлж байна")

with open(FILE, 'r') as f:
    content = f.read()

# ============================================
# 3. 📥 Ачаа товч устгах
# ============================================
# Ямар ч <button> дотор 📥 болон Ачаа хамт байвал устгах
def remove_achaa_buttons(text):
    """Remove any <button>...</button> block containing 📥 or 'Ачаа'"""
    result = []
    i = 0
    while i < len(text):
        if text[i:i+7] == '<button':
            # Find matching </button>
            depth = 1
            j = i + 7
            while j < len(text) and depth > 0:
                if text[j:j+7] == '<button':
                    depth += 1
                    j += 7
                elif text[j:j+9] == '</button>':
                    depth -= 1
                    j += 9
                    if depth == 0:
                        break
                else:
                    j += 1
            
            btn = text[i:j]
            if '📥' in btn and 'Ачаа' in btn:
                # Skip this button
                pass
            else:
                result.append(btn)
            i = j
        else:
            result.append(text[i])
            i += 1
    return ''.join(result)

content_before = content
content = remove_achaa_buttons(content)
if content_before != content:
    print("✅ 📥 Ачаа товч устгагдав")

# ============================================
# 4. Form edit initial state-т cost_price нэмэх
# ============================================
if 'cost_price: p.cost_price' not in content:
    content = re.sub(
        r'(price: p\.price\?\.toString\(\) \|\| "",)',
        r'\1\n      cost_price: p.cost_price?.toString() || "",',
        content
    )
    print("✅ Edit state-т cost_price нэмэгдэв")

# ============================================
# 5. Default form state-т cost_price нэмэх
# ============================================
if not re.search(r'\bcost_price: "",', content):
    content = re.sub(
        r'(\s+)price: "",(\s+)discount_percent',
        r'\1price: "",\1cost_price: "",\2discount_percent',
        content
    )
    print("✅ Default state-т cost_price нэмэгдэв")

# ============================================
# 6. Save mutation-т cost_price нэмэх
# ============================================
if 'cost_price: Number(form.cost_price)' not in content:
    content = re.sub(
        r'price: Number\(form\.price\), discount_percent',
        'price: Number(form.price), cost_price: Number(form.cost_price) || 0, discount_percent',
        content
    )
    print("✅ Save mutation-т cost_price нэмэгдэв")

# ============================================
# 7. Барааны нэр input-ий өмнө label нэмэх
# ============================================
old_name_input = '<input className="input" placeholder="Барааны нэр"'
if old_name_input in content and '📝 Барааны нэр' not in content:
    new_name = '<label className="mb-1 block text-sm font-semibold">📝 Барааны нэр</label>\n              ' + old_name_input
    content = content.replace(old_name_input, new_name)
    print("✅ Барааны нэр label нэмэгдэв")

# ============================================
# 8. Үнэ input-ий өмнө label + доор Үндсэн үнэ input нэмэх
# ============================================
old_price_input = '<input className="input" type="number" placeholder="Үнэ (₮)" value={form.price} onChange={(e) => set("price", e.target.value)} />'
if old_price_input in content:
    # Хэрэв аль хэдийн Зарж буй үнэ label байгаа бол өөрчлөхгүй
    price_section = ''
    if '💵 Зарж буй үнэ' not in content:
        price_section += '<label className="mb-1 mt-3 block text-sm font-semibold">💵 Зарж буй үнэ (₮)</label>\n              '
    price_section += old_price_input
    if 'form.cost_price' not in content or '💰 Үндсэн үнэ' not in content:
        price_section += '\n              <label className="mb-1 mt-3 block text-sm font-semibold">💰 Үндсэн үнэ (өртөг)</label>'
        price_section += '\n              <input className="input" type="number" placeholder="ж: 100000" value={form.cost_price || ""} onChange={(e) => set("cost_price", e.target.value)} />'
    
    if price_section != old_price_input:
        content = content.replace(old_price_input, price_section)
        print("✅ Үнэ + Үндсэн үнэ input нэмэгдэв")

# ============================================
# Хадгалах
# ============================================
with open(FILE, 'w') as f:
    f.write(content)

# ============================================
# Шалгах
# ============================================
print("\n" + "=" * 50)
print("ШАЛГАХ:")
print("=" * 50)
print(f"  cost_price мөр: {content.count('cost_price')}")
print(f"  📥 Ачаа товч (0 байх ёстой): {sum(1 for line in content.split(chr(10)) if '📥' in line and 'Ачаа' in line)}")
print(f"  💰 Үндсэн үнэ label: {content.count('💰 Үндсэн үнэ')}")
print(f"  💵 Зарж буй үнэ label: {content.count('💵 Зарж буй үнэ')}")
print(f"  📝 Барааны нэр label: {content.count('📝 Барааны нэр')}")
print("\n✅ Дууссан!")
