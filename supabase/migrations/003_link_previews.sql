-- 003: preview image for links (filled from the page's og:image by the unfurl function).
alter table public.items add column if not exists image_url text;
