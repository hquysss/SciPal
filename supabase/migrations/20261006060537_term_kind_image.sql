-- A glossary term is a word or a place. Either may carry one photo from the lesson media store
-- (R2), with a description in both languages and an optional credit. Lessons tag terms inline
-- with {term:<id>:text}; the popover and the end-of-lesson list read these columns.

alter table public.terms
  add column kind text not null default 'word' check (kind in ('word', 'place')),
  add column image_url text,
  add column image_alt_en text,
  add column image_alt_vi text,
  add column image_credit text check (image_credit is null or char_length(image_credit) <= 200),
  add constraint terms_image_alt check (
    image_url is null or (coalesce(btrim(image_alt_en), '') <> '' and coalesce(btrim(image_alt_vi), '') <> '')
  );
