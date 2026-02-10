// Supabase代理客户端 - 绕过浏览器扩展干扰
class SupabaseProxy {
  private baseUrl: string
  
  constructor() {
    this.baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://www.flowithmusic.com'
  }
  
  async insert(table: string, data: any) {
    const response = await fetch(`${this.baseUrl}/api/supabase-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'insert',
        table,
        data,
      }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Insert failed')
    }
    
    return { data: result.data, error: null }
  }
  
  async select(table: string, options?: {
    select?: string
    filters?: any
    single?: boolean
    limit?: number
    order?: { column: string, ascending: boolean }
    offset?: number // 添加 offset 参数
  }) {
    const response = await fetch(`${this.baseUrl}/api/supabase-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'select',
        table,
        filters: options?.filters,
        options: {
          select: options?.select,
          single: options?.single,
          limit: options?.limit,
          order: options?.order,
          offset: options?.offset, // 将 offset 传递给后端
        },
      }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Select failed')
    }
    
    return { data: result.data, error: null }
  }
  
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/supabase-proxy?action=test&table=letters`)
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Proxy connection test failed:', error)
      return false
    }
  }
}

export const supabaseProxy = new SupabaseProxy()