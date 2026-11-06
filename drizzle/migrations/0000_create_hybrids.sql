CREATE TABLE public.hybrids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  recipe text NOT NULL,
  cls smallint NOT NULL CHECK (cls BETWEEN 1 AND 10),
  parent_a smallint NOT NULL CHECK (parent_a BETWEEN 1 AND 1234),
  parent_b smallint NOT NULL CHECK (parent_b BETWEEN 1 AND 1234),
  ratio_a smallint NOT NULL CHECK (ratio_a IN (10,20,30,40,50,60,70,80,90)),
  config text NOT NULL DEFAULT 'STANDARD' CHECK (config IN ('STANDARD','ENZYME')),
  iteration integer NOT NULL CHECK (iteration BETWEEN 1 AND 999999),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_a < parent_b),
  UNIQUE (recipe, iteration)
);

GRANT SELECT ON public.hybrids TO anon, authenticated;
GRANT ALL ON public.hybrids TO service_role;

ALTER TABLE public.hybrids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view generated hybrids"
ON public.hybrids FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX hybrids_parent_a_idx ON public.hybrids (parent_a, created_at DESC);
CREATE INDEX hybrids_parent_b_idx ON public.hybrids (parent_b, created_at DESC);

-- Records a generated hybrid and assigns the next shared iteration for its recipe.
-- Parents must arrive canonical (parent_a < parent_b, ratio_a = parent_a's share).
CREATE OR REPLACE FUNCTION public.record_hybrid(
  _recipe text, _cls smallint, _parent_a smallint, _parent_b smallint, _ratio_a smallint, _config text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _it integer;
  _roman text[] := ARRAY['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_recipe));
  SELECT coalesce(max(iteration), 0) + 1 INTO _it FROM public.hybrids WHERE recipe = _recipe;
  INSERT INTO public.hybrids (name, recipe, cls, parent_a, parent_b, ratio_a, config, iteration)
  VALUES (_recipe || '-' || lpad(_it::text, 6, '0'), _recipe, _cls, _parent_a, _parent_b, _ratio_a, _config, _it);
  RETURN _it;
END;
$$;

REVOKE ALL ON FUNCTION public.record_hybrid(text, smallint, smallint, smallint, smallint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_hybrid(text, smallint, smallint, smallint, smallint, text) TO service_role;