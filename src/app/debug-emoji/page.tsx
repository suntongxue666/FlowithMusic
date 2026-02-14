'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'

export default function DebugEmojiPage() {
    const [logs, setLogs] = useState<string[]>([])
    const [user, setUser] = useState<any>(null)
    const [letters, setLetters] = useState<any[]>([])

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
        console.log(msg)
    }

    const checkAuth = async () => {
        addLog('Checking Auth...')

        if (!supabase) {
            addLog('❌ Supabase client is null')
            return null
        }

        // Check Supabase Auth
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        if (error) addLog(`Supabase Auth Error: ${error.message}`)
        else addLog(`Supabase Auth User: ${authUser?.id || 'None'}`)

        // Check UserService
        const currentUser = await userService.getCurrentUserAsync()
        setUser(currentUser)
        addLog(`UserService User: ${currentUser?.id || 'None'}`)

        return currentUser
    }

    const loadLetters = async () => {
        addLog('Loading Letters...')
        const u = await checkAuth()
        if (!u) {
            addLog('No user, cannot list letters')
            return
        }

        if (!supabase) {
            addLog('❌ Supabase client is null')
            return
        }

        try {
            const { data, error } = await supabase
                .from('letters')
                .select('*')
                .eq('user_id', u.id)
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) {
                addLog(`Load Error: ${error.message}`)
            } else {
                addLog(`Loaded ${data.length} letters`)
                setLetters(data)
            }
        } catch (e: any) {
            addLog(`Exception loading letters: ${e.message}`)
        }
    }

    const createTestLetter = async (withEmoji: boolean) => {
        addLog(`Creating Test Letter (${withEmoji ? 'With Emoji' : 'No Emoji'})...`)
        const u = await checkAuth()

        // Test direct DB insert to bypass service logic first
        const testData = {
            link_id: `debug-${Date.now()}`,
            user_id: u?.id || null, // Try to stick to current user
            recipient_name: 'Debug User',
            message: 'Debug Message',
            song_id: 'test-song',
            song_title: 'Test Song',
            song_artist: 'Test Artist',
            song_album_cover: 'https://placehold.co/60',
            song_preview_url: '',
            song_spotify_url: '',
            song_duration_ms: 1000,
            is_public: true,
            animation_config: withEmoji ? { emojis: ['😀', '🚀'] } : {}
        }

        addLog(`Attempting Insert: ${JSON.stringify(testData, null, 2)}`)

        if (!supabase) {
            addLog('❌ Supabase client is null')
            return
        }

        const { data, error } = await supabase
            .from('letters')
            .insert(testData)
            .select()
            .single()

        if (error) {
            addLog(`❌ INSERT ERROR: ${JSON.stringify(error)}`)
            alert(`Insert Failed: ${error.message}`)
        } else {
            addLog(`✅ Insert Success! ID: ${data.link_id}`)
            loadLetters()
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Debug Emoji Persistence</h1>

            <div className="space-y-4 mb-8">
                <div className="flex gap-4">
                    <button onClick={() => checkAuth()} className="px-4 py-2 bg-blue-500 text-white rounded">
                        Check Auth
                    </button>
                    <button onClick={() => loadLetters()} className="px-4 py-2 bg-green-500 text-white rounded">
                        Analyze DB Letters
                    </button>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => createTestLetter(false)} className="px-4 py-2 bg-gray-500 text-white rounded">
                        Test Insert (No Emoji)
                    </button>
                    <button onClick={() => createTestLetter(true)} className="px-4 py-2 bg-purple-500 text-white rounded">
                        Test Insert (WITH Emoji)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="border p-4 rounded bg-gray-50 h-96 overflow-auto">
                    <h2 className="font-bold mb-2">Logs</h2>
                    {logs.map((log, i) => (
                        <div key={i} className="text-xs font-mono mb-1 border-b pb-1">{log}</div>
                    ))}
                </div>

                <div className="border p-4 rounded bg-gray-50 h-96 overflow-auto">
                    <h2 className="font-bold mb-2">Recent DB Letters</h2>
                    {letters.map(l => (
                        <div key={l.id} className="text-xs mb-2 p-2 bg-white rounded border">
                            <div>LinkID: {l.link_id}</div>
                            <div>Effect: {l.effect_type}</div>
                            <div>Config: {JSON.stringify(l.animation_config)}</div>
                            <div>UserID: {l.user_id}</div>
                            <div>Created: {l.created_at}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
