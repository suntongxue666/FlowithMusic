import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 环境变量回退机制
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oiggdnnehohoaycyiydn.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU'

console.log('Supabase config:', { 
  url: supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length 
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 添加CORS头
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }))
}

export async function POST(request: NextRequest) {
  try {
    const { action, table, data, filters, options } = await request.json()
    
    console.log('Proxy API called:', { action, table, hasData: !!data })
    
    switch (action) {
      case 'insert':
        const { data: insertData, error: insertError } = await supabase
          .from(table)
          .insert(data)
          .select()
          .single()
        
        if (insertError) {
          console.error('Insert error:', insertError)
          return addCorsHeaders(NextResponse.json({ error: insertError }, { status: 400 }))
        }
        
        return addCorsHeaders(NextResponse.json({ data: insertData }))
      
      case 'select':
        let query = supabase.from(table).select(options?.select || '*')
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (key === 'eq') {
              Object.entries(value as any).forEach(([field, val]) => {
                query = query.eq(field, val)
              })
            }
            if (key === 'ilike') {
              Object.entries(value as any).forEach(([field, val]) => {
                query = query.ilike(field, val as string)
              })
            }
          })
        }
        
        if (options?.limit) {
          query = query.limit(options.limit)
        }
        
        if (options?.order) {
          query = query.order(options.order.column, { ascending: options.order.ascending })
        }
        
        let selectResult
        if (options?.single) {
          selectResult = await query.single()
        } else {
          selectResult = await query
        }
        
        const { data: selectData, error: selectError } = selectResult
        
        if (selectError) {
          console.error('Select error:', selectError)
          return addCorsHeaders(NextResponse.json({ error: selectError }, { status: 400 }))
        }
        
        return addCorsHeaders(NextResponse.json({ data: selectData }))
      
      case 'delete':
        let deleteQuery = supabase.from(table).delete()
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (key === 'eq') {
              Object.entries(value as any).forEach(([field, val]) => {
                deleteQuery = deleteQuery.eq(field, val)
              })
            }
          })
        }
        
        const { data: deleteData, error: deleteError } = await deleteQuery
        
        if (deleteError) {
          console.error('Delete error:', deleteError)
          return addCorsHeaders(NextResponse.json({ error: deleteError }, { status: 400 }))
        }
        
        return addCorsHeaders(NextResponse.json({ data: deleteData }))
      
      default:
        return addCorsHeaders(NextResponse.json({ error: 'Invalid action' }, { status: 400 }))
    }
  } catch (error) {
    console.error('Proxy API error:', error)
    return addCorsHeaders(NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 }))
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  const table = searchParams.get('table')
  
  console.log('Proxy GET called:', { action, table })
  
  if (action === 'test') {
    try {
      // 测试数据库连接
      const { data, error } = await supabase
        .from('letters')
        .select('count')
        .limit(1)
      
      if (error) {
        console.error('Test error:', error)
        return addCorsHeaders(NextResponse.json({ 
          success: false, 
          error: error.message 
        }))
      }
      
      return addCorsHeaders(NextResponse.json({ 
        success: true, 
        message: 'Server-side Supabase connection successful',
        supabaseUrl: supabaseUrl,
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Test exception:', error)
      return addCorsHeaders(NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }))
    }
  }
  
  return addCorsHeaders(NextResponse.json({ error: 'Invalid request' }, { status: 400 }))
}