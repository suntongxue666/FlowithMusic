import { Letter } from './supabase'
import { persistentStorage } from './persistentStorage'

// 简单的服务器端存储，使用持久化存储
export class ServerLetterStorage {
  static async save(linkId: string, letter: Letter): Promise<Letter> {
    const savedLetter = await persistentStorage.saveLetter(letter)
    console.log(`Letter saved to server storage: ${linkId}`)
    return savedLetter
  }
  
  static async get(linkId: string): Promise<Letter | null> {
    const letter = await persistentStorage.getLetter(linkId)
    if (letter) {
      console.log(`Letter found in server storage: ${linkId}`)
    } else {
      console.log(`Letter not found in server storage: ${linkId}`)
    }
    return letter
  }
  
  static async getAll(): Promise<Letter[]> {
    return persistentStorage.getAllLetters()
  }
  
  static async getUserLetters(userId?: string, anonymousId?: string): Promise<Letter[]> {
    return await persistentStorage.getUserLetters(userId, anonymousId)
  }
}