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
                this.size = 20 + Math.random() * 30
                this.speedY = 1 + Math.random() * 3
                this.speedX = (Math.random() - 0.5) * 1
                this.opacity = mode === 'preview' ? 0.3 : 1
                this.rotation = Math.random() * 360
                this.rotationSpeed = (Math.random() - 0.5) * 2
            }

            update() {
                this.y -= this.speedY // Float UP
                this.x += this.speedX
                this.rotation += this.rotationSpeed

                // Reset if goes off top
                if (this.y < -50) {
                    this.y = canvas!.height + 50
                    this.x = Math.random() * canvas!.width
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.save()
                ctx.translate(this.x, this.y)
                ctx.rotate(this.rotation * Math.PI / 180)
                ctx.globalAlpha = this.opacity
                ctx.font = `${this.size}px serif`
                ctx.fillText(this.emoji, -this.size / 2, -this.size / 2)
                ctx.restore()
            }
        }

        // Initialize particles
        const particleCount = mode === 'preview' ? 15 : 50
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
                zIndex: 0 // Background effect
            }}
        />
    )
}
