'use client'

import { useEffect } from 'react'
import { useUserState } from '@/hooks/useUserState'
import { useAdContext } from '@/contexts/AdContext'
import { useSearchParams, usePathname } from 'next/navigation'

export default function GoogleAdSense({ forceHide = false, isGlobal = false }: { forceHide?: boolean, isGlobal?: boolean }) {
  const { user } = useUserState()
  const { isAdForceHidden } = useAdContext()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const fromParam = searchParams.get('from')
  
  const isAdmin = user?.id === 'a2a0c0dc-0937-4f15-8796-6ba39fcfa981' || (user as any)?.is_admin
  // 只有真正购买了高级会员的用户才移除广告
  // 管理员仍然可以看到广告（如用户所要求）
  const isPremium = user?.is_premium && !isAdmin
  
  useEffect(() => {
    // 逻辑：
    // 1. 如果是 Layout 里的全局组件，在信件详情页不工作（交给页面自己控制）
    if (isGlobal && pathname.startsWith('/letter/')) return
    
    // 2. 隐藏逻辑
    if (isPremium || forceHide || isAdForceHidden || fromParam) return
    
    // 只有在非会员的情况下才加载脚本
    const script = document.createElement('script')
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8076620471820789'
    script.async = true
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)
    
    return () => {
      // 卸载时无需移除，因为脚本是动态注入的
    }
  }, [isPremium])

  return null
}
