'use client'

import { useEffect } from 'react'
import { useUserState } from '@/hooks/useUserState'

export default function GoogleAdSense() {
  const { user } = useUserState()
  
  // 只有真正购买了高级会员的用户才移除广告
  // 管理员仍然可以看到广告（如用户所要求）
  const isPremium = user?.is_premium
  
  useEffect(() => {
    if (isPremium) return
    
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
