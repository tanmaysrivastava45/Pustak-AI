import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSupabaseAdmin, getSupabaseUserClient } from '../lib/supabase.js';

const router = Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();
    const userId = req.user.id;

    let profile = null;
    if (supabase) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      profile = data;
    }

    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        displayName: profile?.display_name || req.user.user_metadata?.full_name || req.user.email?.split('@')[0],
        createdAt: profile?.created_at || req.user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
