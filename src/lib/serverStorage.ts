import { Letter } from './supabase'

// 简单的服务器端存储
export class ServerLetterStorage {
  private static letters = new Map<string, Letter>()
  
  static save(linkId: string, letter: Letter) {
    this.letters.set(linkId, letter)
    console.log(`Letter saved to server storage: ${linkId}`)
  }
  
  static get(linkId: string): Letter | null {
    const letter = this.letters.get(linkId)
    if (letter) {
      console.log(`Letter found in server storage: ${linkId}`)
    } else {
      console.log(`Letter not found in server storage: ${linkId}`)
    }
    return letter || null
  }
  
  static getAll(): Letter[] {
    return Array.from(this.letters.values())
  }
  
  static getUserLetters(userId?: string, anonymousId?: string): Letter[] {
    const allLetters = this.getAll()
    return allLetters.filter(letter => {
      if (userId && userId !== '') {
        return letter.user_id === userId
      } else if (anonymousId && anonymousId !== '') {
        return letter.anonymous_id === anonymousId
      }
      return false
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
}