'use client'

import { useState, useEffect } from 'react'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'

export default function TestVisibility() {
    const [status, setStatus] = useState<string>('Ready')
    const [createdLetter, setCreatedLetter] = useState<any>(null)
    const [exploreLetters, setExploreLetters] = useState<any[]>([])

    const runTest = async () => {
        try {
            setStatus('Initializing user...')
            await userService.initializeUser()

            const user = userService.getCurrentUser()
            setStatus(`User: ${user ? user.email : 'Guest'}`)

            setStatus('Creating test letter...')
            const letter = await letterService.createLetter({
                to: 'Visibility Test',
                message: 'This is a test letter to verify visibility in Explore and History.',
                song: {
                    id: 'test-id-' + Date.now(),
                    title: 'Test Song',
                    artist: 'Test Artist',
                    albumCover: 'https://i.scdn.co/image/ab67616d0000b273b0699480dc85006b52a5146c',
                    spotifyUrl: 'https://open.spotify.com/track/4cOdzh0s2UDv9S999ThSET',
                    duration_ms: 180000
                }
            })
            setCreatedLetter(letter)
            setStatus('Letter created! link_id: ' + letter.link_id)

            setStatus('Fetching Explore letters...')
            const response = await fetch('/api/explore?limit=5&format=camelCase')
            const json = await response.json()
            const items = json.items || []
            setExploreLetters(items)

            const found = items.some((l: any) => l.linkId === letter.link_id)
            if (found) {
                setStatus('SUCCESS: New letter found in Explore API!')
            } else {
                setStatus('FAILURE: New letter NOT found in Explore API. Check is_public or RLS.')
            }

        } catch (error: any) {
            console.error(error)
            setStatus('ERROR: ' + error.message)
        }
    }

    return (
        <div className="p-10 font-mono text-sm max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Letter Visibility Test</h1>
            <div className="bg-gray-100 p-4 rounded mb-4">
                <strong>Status:</strong> {status}
            </div>

            <button
                onClick={runTest}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
                Run Test
            </button>

            {createdLetter && (
                <div className="mt-8">
                    <h2 className="font-bold">Created Letter:</h2>
                    <pre className="bg-gray-50 p-2 mt-2 text-xs overflow-auto">
                        {JSON.stringify(createdLetter, null, 2)}
                    </pre>
                </div>
            )}

            {exploreLetters.length > 0 && (
                <div className="mt-8">
                    <h2 className="font-bold">Explore API Top 5:</h2>
                    <ul className="mt-2 space-y-1">
                        {exploreLetters.map((l: any) => (
                            <li key={l.linkId} className={l.linkId === createdLetter?.link_id ? 'text-green-600 font-bold' : ''}>
                                {l.linkId} - {l.recipientName} ({new Date(l.createdAt).toLocaleTimeString()})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
