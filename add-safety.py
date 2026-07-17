#!/usr/bin/env python3
"""
Products page-ийн save функцэд хамгаалалт нэмнэ.
- Хоосон variants-ыг save хийхийг зөвшөөрөхгүй
- Alert-үүд илүү тод
- Error handling нэмэгдүүлнэ
"""

import re
import shutil
import os
import time

FILE = "src/app/admin/products/page.js"
timestamp = int(time.time())
shutil.copy(FILE, f"{FILE}.pre-safety-{timestamp}")

with open(FILE, 'r') as f:
    content = f.read()

# Хуучин save функцийг олох
old_save = '''  async function save() {
    if (!form.name || !form.price) return alert("Нэр болон үнэ заавал.");
    setBusy(true);
    const payload = {'''

new_save = '''  async function save() {
    if (!form.name || !form.price) return alert("Нэр болон үнэ заавал.");
    
    // ХАМГААЛАЛТ: Одоо байгаа бараа засаж байгаа бол variant-ыг заавал шалгах
    if (form.id) {
      const validVariants = form.variants.filter(v => v.size || v.color || v.stock_branch1 || v.stock_branch2);
      if (validVariants.length === 0) {
        return alert("⚠️ АНХААР! Variant байхгүй байна. Хадгалбал бүх үлдэгдэл алдагдана. Modal-ыг хааж, дахин нээж variant-ыг ачаалж үзнэ үү.");
      }
      // Хэрэв variant тоо гэнэт багассан бол баталгаажуулах
      const { count: oldCount } = await supabase.from("product_variants").select("id", { count: "exact", head: true }).eq("product_id", form.id);
      if (oldCount && validVariants.length < oldCount) {
        if (!confirm(`⚠️ Хуучин ${oldCount} variant байсан, шинэ ${validVariants.length} variant үлдэнэ. ${oldCount - validVariants.length} variant устгагдана. Итгэлтэй байна уу?`)) {
          return;
        }
      }
    }
    
    setBusy(true);
    const payload = {'''

if old_save in content:
    content = content.replace(old_save, new_save)
    print("✅ Save функцэд хамгаалалт нэмэгдэв")
else:
    print("⚠️ Save функцын эхлэл олдсонгүй — гараар шалгах шаардлагатай")

# Хамгаалалт 2: Save дуусахад алдаа мэдээлэх
old_end = '''    if (variants.length) await supabase.from("product_variants").insert(variants);
    setOpen(false); setForm(empty);
    await load();
    setBusy(false);
  }'''

new_end = '''    if (variants.length) {
      const { error: insErr } = await supabase.from("product_variants").insert(variants);
      if (insErr) {
        alert("❌ Variant хадгалах алдаа: " + insErr.message);
        setBusy(false);
        return;
      }
    }
    setOpen(false); setForm(empty);
    await load();
    setBusy(false);
    alert("✅ Амжилттай хадгалагдлаа");
  }'''

if old_end in content:
    content = content.replace(old_end, new_end)
    print("✅ Save-ий эцсийн хэсэгт alert нэмэгдэв")
else:
    print("⚠️ Save-ий эцсийн хэсэг олдсонгүй")

# Хадгалах
with open(FILE, 'w') as f:
    f.write(content)

# Шалгах
print("\n" + "=" * 50)
print("ШАЛГАХ:")
print("=" * 50)
print(f"  'ХАМГААЛАЛТ' comment: {content.count('ХАМГААЛАЛТ')}")
print(f"  'Амжилттай хадгалагдлаа': {content.count('Амжилттай хадгалагдлаа')}")
print(f"  'baseline check variant': {content.count('validVariants')}")
print("\n✅ Дууссан!")
