-- FleetKeys - add phone number to company users
-- Run in Supabase SQL editor (or your migrations pipeline).

alter table public.company_users
add column if not exists phone text;

comment on column public.company_users.phone is 'User phone number (free-form text; recommended E.164 format, e.g. +3876xxxxxxx)';

