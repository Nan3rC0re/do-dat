import { cache } from 'react'
import { createClient } from './server'

// cache() deduplicates this within a single render tree —
// layout and page both call it but the network request only fires once.
export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
