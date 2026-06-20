-- Product page-д category.pair_price автоматаар орж ирнэ
-- Үүний тулд /product/[id]/page.js дотор categories(name,pair_price) гэж нэгтгэдэг
-- (хэрэв одоо зөвхөн categories(name) бол өөрчилнө)

-- Шалгах: ангилал бүрд pair_price байгаа эсэх
select id, name, slug, pair_price from categories order by sort;

-- Жишээ: пүүз ангилалд 280000 оноох
-- update categories set pair_price = 280000 where slug = 'sneakers';
