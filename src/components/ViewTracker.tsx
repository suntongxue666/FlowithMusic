'use client'

import { useEffect, useRef, useState } from 'react'
import { ImprovedUserIdentity } from '@/lib/improvedUserIdentity'

interface ViewTrackerProps {
  letterId: string
}

export default function ViewTracker({ letterId }: ViewTrackerProps) {
  const startTimeRef = useRef<Date>(new Date())
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`)
  const visibilityTimeRef = useRef<number>(0)
  const lastVisibilityChangeRef = useRef<Date>(new Date())
  const maxScrollDepthRef = useRef<number>(0)
  const interactionCountRef = useRef<number>(0)
  const [hasRecorded, setHasRecorded] = useState(false)

  // 记录滚动深度
  const updateScrollDepth = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollPercentage = documentHeight > 0 ? Math.round((scrollTop / documentHeight) * 100) : 0
    
    if (scrollPercentage > maxScrollDepthRef.current) {
      maxScrollDepthRef.current = Math.min(scrollPercentage, 100)
    }
  }

  // 记录用户交互
  const recordInteraction = () => {
    interactionCountRef.current += 1
  }

  // 处理页面可见性变化
  const handleVisibilityChange = () => {
    const now = new Date()
    
    if (document.hidden) {
      // 页面变为隐藏，累加可见时间
      const visibleTime = now.getTime() - lastVisibilityChangeRef.current.getTime()
      visibilityTimeRef.current += visibleTime
    } else {
      // 页面变为可见，重置开始时间
      lastVisibilityChangeRef.current = now
    }
  }

  // 发送浏览数据
  const sendViewData = async () => {
    if (hasRecorded) return

    const endTime = new Date()
    const totalDuration = (endTime.getTime() - startTimeRef.current.getTime()) / 1000

    // 如果页面当前可见，添加最后的可见时间
    let totalVisibleTime = visibilityTimeRef.current
    if (!document.hidden) {
      totalVisibleTime += endTime.getTime() - lastVisibilityChangeRef.current.getTime()
    }
    totalVisibleTime = totalVisibleTime / 1000 // 转换为秒

    const viewData = {
      viewStartTime: startTimeRef.current.toISOString(),
      viewEndTime: endTime.toISOString(),
      viewDuration: Math.round(totalDuration),
      pageVisible: Math.round(totalVisibleTime),
      scrollDepth: maxScrollDepthRef.current,
      interactionCount: interactionCountRef.current,
      sessionId: sessionIdRef.current
    }

    console.log('📊 发送浏览数据:', viewData)

    try {
      // 获取用户身份
      const userIdentity = ImprovedUserIdentity.getOrCreateIdentity()
      
      // 设置cookie
      document.cookie = `anonymous_id=${encodeURIComponent(userIdentity.id)}; path=/; max-age=31536000; SameSite=Lax`
      
      await fetch(`/api/letters/${letterId}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(viewData)
      })

      setHasRecorded(true)
      console.log('✅ 浏览数据发送成功')
    } catch (error) {
      console.error('❌ 发送浏览数据失败:', error)
    }
  }

  useEffect(() => {
    // 监听滚动
    const handleScroll = () => {
      updateScrollDepth()
      recordInteraction()
    }

    // 监听用户交互
    const handleClick = () => recordInteraction()
    const handleKeydown = () => recordInteraction()
    const handleTouchstart = () => recordInteraction()

    // 添加事件监听器
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('touchstart', handleTouchstart, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 页面卸载时发送数据
    const handleBeforeUnload = () => {
      sendViewData()
    }

    // 页面焦点丢失时发送数据
    const handleBlur = () => {
      sendViewData()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('blur', handleBlur)

    // 定时发送数据（每30秒）
    const interval = setInterval(() => {
      if (!hasRecorded) {
        sendViewData()
      }
    }, 30000)

    return () => {
      // 清理事件监听器
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('touchstart', handleTouchstart)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('blur', handleBlur)
      clearInterval(interval)

      // 组件卸载时发送最终数据
      if (!hasRecorded) {
        sendViewData()
      }
    }
  }, [letterId, hasRecorded])

  // 初始滚动深度记录
  useEffect(() => {
    updateScrollDepth()
  }, [])

  return null // 这是一个隐形的追踪组件
}