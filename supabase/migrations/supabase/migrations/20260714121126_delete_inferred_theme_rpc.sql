create or replace function public.delete_inferred_theme(p_theme text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set inferred_themes = inferred_themes - p_theme
  where id = auth.uid();
end;
$$;

grant execute on function public.delete_inferred_theme(text) to authenticated;
