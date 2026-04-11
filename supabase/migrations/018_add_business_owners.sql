CREATE TABLE public.business_owners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  ownership_percentage numeric NOT NULL DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_owners_pkey PRIMARY KEY (id),
  CONSTRAINT business_owners_business_id_fkey FOREIGN KEY (business_id)
    REFERENCES public.businesses(id) ON DELETE CASCADE
);

ALTER TABLE public.business_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage owners of their businesses"
  ON public.business_owners
  FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      UNION
      SELECT business_id FROM public.business_members
        WHERE user_id = auth.uid() AND is_active = true
    )
  );
