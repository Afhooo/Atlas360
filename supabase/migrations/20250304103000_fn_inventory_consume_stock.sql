-- supabase/migrations/20250304103000_fn_inventory_consume_stock.sql
-- Función auxiliar para descontar stock al momento de crear órdenes

create or replace function public.fn_inventory_consume_stock(
  p_product_id uuid,
  p_site_id uuid,
  p_quantity numeric
) returns void
language plpgsql
as $$
begin
  if p_product_id is null or p_site_id is null or coalesce(p_quantity, 0) <= 0 then
    return;
  end if;

  update public.inventory_stock
  set
    quantity = greatest(quantity - p_quantity, 0),
    updated_at = now()
  where product_id = p_product_id
    and site_id = p_site_id;
end;
$$;

comment on function public.fn_inventory_consume_stock(uuid, uuid, numeric)
  is 'Descuenta stock para un producto y sucursal específicos. Se invoca al registrar órdenes.';
