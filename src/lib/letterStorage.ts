interface MusicLetter {
  id: string
  to: string
  message: string
  song: {
    id: string
    title: string
    artist: string
    albumCover: string
    previewUrl?: string
    spotifyUrl: string
  }
  createdAt: Date
  linkId: string // URL-friendly ID for sharing
}

class LetterStorage {
  private storageKey = 'flowith-music-letters'

  private generateLinkId(): string {
    const now = new Date()
    const timeStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0') + 
                   now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0')
    
    // Generate 6-character random alphanumeric string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let randomStr = ''
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return timeStr + randomStr
  }

  getLetters(): MusicLetter[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return []
      
      const letters = JSON.parse(stored)
      return letters.map((letter: any) => ({
        ...letter,
        createdAt: new Date(letter.createdAt)
      }))
    } catch (error) {
      console.error('Failed to load letters:', error)
      return []
    }
  }

  saveLetters(letters: MusicLetter[]): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(letters))
    } catch (error) {
      console.error('Failed to save letters:', error)
    }
  }

  addLetter(letter: Omit<MusicLetter, 'id' | 'createdAt' | 'linkId'>): MusicLetter {
    const linkId = this.generateLinkId()
    const newLetter: MusicLetter = {
      ...letter,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      linkId: linkId,
      createdAt: new Date()
    }

    const letters = this.getLetters()
    letters.unshift(newLetter) // Add to beginning
    
    // Keep only the latest 50 letters
    if (letters.length > 50) {
      letters.splice(50)
    }
    
    this.saveLetters(letters)
    return newLetter
  }

  getRecentLetters(limit: number = 6): MusicLetter[] {
    return this.getLetters().slice(0, limit)
  }

  getLetterByLinkId(linkId: string): MusicLetter | null {
    const letters = this.getLetters()
    return letters.find(letter => letter.linkId === linkId) || null
  }
}

export const letterStorage = new LetterStorage()
export type { MusicLetter }