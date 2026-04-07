ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'completed'));

-- To make things safe, let's update anyone who already has workspaces or thread accounts to 'completed' so we don't trap existing users?
-- Actually, it's safer to let them do onboarding or just update them manually. Let's write a small script to un-trap them.
UPDATE public.profiles p
SET onboarding_status = 'completed'
WHERE EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.user_id = p.id
);
