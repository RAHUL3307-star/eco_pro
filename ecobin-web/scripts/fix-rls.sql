-- ══════════════════════════════════════════════════════════════════
-- EcoBin — Nuclear RLS Fix
-- Drops ALL SELECT policies on bins + bin_members (every name variant)
-- then creates the correct non-recursive ones.
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- STEP 1: Drop EVERY possible policy on bins
-- (covers all naming variants from previous migrations)
-- ─────────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bins'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bins', pol.policyname);
    RAISE NOTICE 'Dropped bins policy: %', pol.policyname;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- STEP 2: Drop EVERY possible policy on bin_members
-- ─────────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bin_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bin_members', pol.policyname);
    RAISE NOTICE 'Dropped bin_members policy: %', pol.policyname;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- STEP 3: Create the SECURITY DEFINER helper function
-- This breaks the circular reference by running WITHOUT RLS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_bin_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT bin_id FROM public.bin_members WHERE user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────
-- STEP 4: Re-create correct non-circular policies
-- ─────────────────────────────────────────────

-- bins: user can see bins they are a member of (via secure function, no recursion)
CREATE POLICY "bins_select_member"
ON public.bins FOR SELECT
USING (id IN (SELECT public.get_my_bin_ids()));

-- bin_members: user can only see their own rows (no reference to bins table)
CREATE POLICY "bin_members_select_own"
ON public.bin_members FOR SELECT
USING (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- STEP 5: Verify — print all current policies
-- ─────────────────────────────────────────────
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('bins', 'bin_members')
ORDER BY tablename, policyname;
