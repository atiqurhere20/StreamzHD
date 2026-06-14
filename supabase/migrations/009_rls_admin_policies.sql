-- Drop existing read-only or restrictive policies if they exist (though we're adding write policies, select policies exist)
-- Let's add admin write policies for all RLS tables

-- 1. channels
create policy "Admins can do all on channels" 
  on public.channels for all 
  to authenticated 
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 2. categories
create policy "Admins can do all on categories"
  on public.categories for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 3. countries
create policy "Admins can do all on countries"
  on public.countries for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 4. slider_images
create policy "Admins can do all on slider_images"
  on public.slider_images for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 5. ad_networks
create policy "Admins can do all on ad_networks"
  on public.ad_networks for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 6. advertisements
create policy "Admins can do all on advertisements"
  on public.advertisements for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 7. epg_sources
create policy "Admins can do all on epg_sources"
  on public.epg_sources for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 8. channel_views
create policy "Admins can do all on channel_views"
  on public.channel_views for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 9. settings
create policy "Admins can do all on settings"
  on public.settings for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 10. activity_logs
create policy "Admins can do all on activity_logs"
  on public.activity_logs for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 11. media_library
create policy "Admins can do all on media_library"
  on public.media_library for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
