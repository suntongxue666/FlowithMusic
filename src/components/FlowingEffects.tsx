'use client'

import React, { useEffect, useRef } from 'react'

interface FlowingEffectsProps {
    emojis: string[]
    mode: 'preview' | 'full'
    intensity?: number // 0-1
}

export default function FlowingEffects({ emojis, mode, intensity = 1 }: FlowingEffectsProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || emojis.length === 0) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let particles: Particle[] = []

        // Canvas setup
        const updateSize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        window.addEventListener('resize', updateSize)
        updateSize()

        class Particle {
            x: number
            y: number
            emoji: string
            size: number
            speedY: number
            speedX: number
            opacity: number
            rotation: number
            rotationSpeed: number

            constructor() {
                this.x = Math.random() * canvas!.width
                this.y = canvas!.height + Math.random() * 100 // Start below screen
                this.emoji = emojis[Math.floor(Math.random() * emojis.length)]
                // 放大 5-10 倍：基础大小 20px，放大后 100-200px
                this.size = 100 + Math.random() * 100 // 100-200px (5-10x of 20px)
                this.speedY = 0.8 + Math.random() * 1.5 // 稍慢一点，让动效更明显
                this.speedX = (Math.random() - 0.5) * 0.8
                this.opacity = mode === 'preview' ? 0.4 : 0.9
                this.rotation = Math.random() * 360
                this.rotationSpeed = (Math.random() - 0.5) * 1.5
            }

            update() {
                this.y -= this.speedY // Float UP
                this.x += this.speedX
                this.rotation += this.rotationSpeed

                // Reset if goes off top
                if (this.y < -this.size) {
                    this.y = canvas!.height + this.size
                    this.x = Math.random() * canvas!.width
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.save()
                ctx.translate(this.x, this.y)
                ctx.rotate(this.rotation * Math.PI / 180)
                ctx.globalAlpha = this.opacity
                ctx.font = `${this.size}px serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(this.emoji, 0, 0)
                ctx.restore()
            }
        }

        // Initialize particles: 预览模式 48 个，完整模式 36-48 个
        const particleCount = mode === 'preview' ? 36 : (24 + Math.floor(Math.random() * 13)) // preview: 48, full: 36-48
        for (let i = 0; i < particleCount; i++) {
            // Stagger start positions for natural look
            const p = new Particle()
            p.y = Math.random() * canvas.height // Fill screen initially
            particles.push(p)
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            particles.forEach(p => {
                p.update()
                p.draw(ctx)
            })

            animationFrameId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', updateSize)
            cancelAnimationFrame(animationFrameId)
        }
    }, [emojis, mode])

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none', // Allow clicks to pass through
                zIndex: 10000 // 确保在所有元素之上显示
            }}
        />
    )
}