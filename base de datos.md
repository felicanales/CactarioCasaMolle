-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ejemplar (
  id bigint NOT NULL DEFAULT nextval('specimens_id_seq'::regclass),
  species_id bigint NOT NULL,
  sector_id bigint NOT NULL,
  user_id bigint,
  collection_date date,
  health_status text,
  location text,
  has_offshoots boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  purchase_date date,
  sale_date date,
  nursery text,
  purchase_price numeric,
  sale_price numeric,
  age_months integer,
  size_cm integer,
  CONSTRAINT ejemplar_pkey PRIMARY KEY (id),
  CONSTRAINT specimens_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.especies(id),
  CONSTRAINT specimens_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectores(id),
  CONSTRAINT specimens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.especies (
  id bigint NOT NULL DEFAULT nextval('species_id_seq'::regclass),
  nombre_común text,
  scientific_name text NOT NULL,
  habitat text,
  estado_conservación text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  nombres_comunes text,
  tipo_morfología USER-DEFINED,
  expectativa_vida text,
  slug text NOT NULL UNIQUE,
  tipo_planta text,
  distribución text,
  floración text,
  cuidado text,
  usos text,
  historia_y_leyendas text,
  historia_nombre text,
  Endémica boolean,
  categoría_de_conservación USER-DEFINED,
  CONSTRAINT especies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fotos (
  id bigint NOT NULL DEFAULT nextval('fotos_id_seq'::regclass),
  especie_id bigint,
  sector_id bigint,
  ejemplar_id bigint,
  storage_path text NOT NULL,
  is_cover boolean DEFAULT false,
  order_index integer DEFAULT 0,
  caption text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fotos_pkey PRIMARY KEY (id),
  CONSTRAINT fotos_especie_id_fkey FOREIGN KEY (especie_id) REFERENCES public.especies(id),
  CONSTRAINT fotos_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectores(id),
  CONSTRAINT fotos_ejemplar_id_fkey FOREIGN KEY (ejemplar_id) REFERENCES public.ejemplar(id)
);
CREATE TABLE public.fotos_especies (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  especie_id bigint NOT NULL,
  storage_path text,
  order_index integer DEFAULT 0,
  is_cover boolean DEFAULT false,
  CONSTRAINT fotos_especies_pkey PRIMARY KEY (id),
  CONSTRAINT fotos_especies_especie_id_fkey FOREIGN KEY (especie_id) REFERENCES public.especies(id)
);
CREATE TABLE public.movimiento_de_inventario (
  id bigint NOT NULL DEFAULT nextval('inventory_movements_id_seq'::regclass),
  specimen_id bigint,
  user_id bigint,
  type USER-DEFINED NOT NULL,
  from_sector_id bigint,
  to_sector_id bigint,
  qty numeric DEFAULT 1 CHECK (qty > 0::numeric),
  note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT movimiento_de_inventario_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_movements_specimen_id_fkey FOREIGN KEY (specimen_id) REFERENCES public.ejemplar(id),
  CONSTRAINT inventory_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(id),
  CONSTRAINT inventory_movements_from_sector_id_fkey FOREIGN KEY (from_sector_id) REFERENCES public.sectores(id),
  CONSTRAINT inventory_movements_to_sector_id_fkey FOREIGN KEY (to_sector_id) REFERENCES public.sectores(id)
);
CREATE TABLE public.public_views (
  id bigint NOT NULL DEFAULT nextval('public_views_id_seq'::regclass),
  entity_type text CHECK (entity_type = ANY (ARRAY['species'::text, 'sector'::text])),
  entity_id bigint NOT NULL,
  ip_address text,
  user_agent text,
  viewed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT public_views_pkey PRIMARY KEY (id)
);
CREATE TABLE public.purchase_items (
  id bigint NOT NULL DEFAULT nextval('purchase_items_id_seq'::regclass),
  purchase_id bigint NOT NULL,
  species_id bigint,
  quantity numeric CHECK (quantity > 0::numeric),
  unit_price numeric CHECK (unit_price >= 0::numeric),
  CONSTRAINT purchase_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id),
  CONSTRAINT purchase_items_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.especies(id)
);
CREATE TABLE public.purchases (
  id bigint NOT NULL DEFAULT nextval('purchases_id_seq'::regclass),
  supplier text,
  status USER-DEFINED DEFAULT 'Pendiente'::purchase_status,
  created_by bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchases_pkey PRIMARY KEY (id),
  CONSTRAINT purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id)
);
CREATE TABLE public.receipt_items (
  id bigint NOT NULL DEFAULT nextval('receipt_items_id_seq'::regclass),
  receipt_id bigint NOT NULL,
  purchase_item_id bigint,
  quantity_received numeric CHECK (quantity_received > 0::numeric),
  CONSTRAINT receipt_items_pkey PRIMARY KEY (id),
  CONSTRAINT receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id),
  CONSTRAINT receipt_items_purchase_item_id_fkey FOREIGN KEY (purchase_item_id) REFERENCES public.purchase_items(id)
);
CREATE TABLE public.receipts (
  id bigint NOT NULL DEFAULT nextval('receipts_id_seq'::regclass),
  purchase_id bigint NOT NULL,
  received_by bigint,
  received_at timestamp with time zone DEFAULT now(),
  CONSTRAINT receipts_pkey PRIMARY KEY (id),
  CONSTRAINT receipts_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id),
  CONSTRAINT receipts_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.usuarios(id)
);
CREATE TABLE public.sectores (
  id bigint NOT NULL DEFAULT nextval('sectors_id_seq'::regclass),
  name text NOT NULL,
  description text,
  image_path text,
  qr_code text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sectores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sectores_especies (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  sector_id bigint NOT NULL,
  especie_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sectores_especies_pkey PRIMARY KEY (id),
  CONSTRAINT sectores_especies_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectores(id),
  CONSTRAINT sectores_especies_especie_id_fkey FOREIGN KEY (especie_id) REFERENCES public.especies(id)
);
CREATE TABLE public.usuarios (
  id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  supabase_uid uuid UNIQUE,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text,
  active boolean,
  updated_at timestamp with time zone,
  created_at timestamp with time zone,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);