import { NextResponse } from 'next/server'
const ANIMAL_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔']
const LIGHT_COLORS = ['#FFE5E5', '#E5F3FF', '#E5FFE5', '#FFF5E5', '#F0E5FF', '#E5FFFF', '#FFE5F5', '#F5FFE5', '#E5E5FF', '#FFFFE5', '#FFE5CC', '#E5FFCC', '#CCE5FF', '#FFCCE5', '#E5CCFF', '#CCFFE5', '#FFCCCC', '#CCFFCC', '#CCCCFF', '#FFFFCC', '#FFE0E0', '#E0FFE0', '#E0E0FF', '#FFFFE0']

function generateAnonymousUser(letter: any) {
  const seedId = letter.anonymous_id || letter.link_id || 'fallback'
  let hash = 0
  for (let i = 0; i < seedId.length; i++) {
    const char = seedId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const emojiIndex = Math.abs(hash) % ANIMAL_EMOJIS.length
  const colorIndex = Math.abs(hash >> 8) % LIGHT_COLORS.length
  const userNumber = Math.abs(hash >> 16) % 100000000
  return {
    emoji: ANIMAL_EMOJIS[emojiIndex],
    backgroundColor: LIGHT_COLORS[colorIndex],
    username: `Guest${userNumber.toString().padStart(8, '0')}`
  }
}

function getAuthorProfile(letter: any) {
  if (letter.user) {
    return {
      type: 'registered',
      id: letter.user.id,
      name: letter.user.display_name || 'Anonymous',
      avatarUrl: letter.user.avatar_url || null,
      avatarInitials: (letter.user.display_name?.charAt(0) || letter.user.email?.charAt(0) || 'U').toUpperCase(),
    }
  } else {
    const anonymousUser = generateAnonymousUser(letter)
    return {
      type: 'anonymous',
      id: letter.anonymous_id || letter.link_id || 'fallback',
      name: anonymousUser.username,
      avatarUrl: null,
      avatarEmoji: anonymousUser.emoji,
      avatarBackgroundColor: anonymousUser.backgroundColor,
    }
  }
}

export async function GET() {
  const { supabaseServer } = await import('@/lib/supabase-server')
  if (!supabaseServer) return NextResponse.json({ error: 'No db' })

  const { data, error } = await supabaseServer
    .from('letters')
    .select(`
      id, link_id, user_id, anonymous_id, is_public,
      user:users(
        id,
        display_name,
        avatar_url
      )
    `)
    .not('user_id', 'is', null)
    .limit(2)
  
  const formatted = data?.map(d => ({
    linkId: d.link_id,
    authorProfile: getAuthorProfile(d)
  }))
  return NextResponse.json(formatted)
}
