import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    const { action, table, data, filters, options } = await request.json()
    
    switch (action) {
      case 'insert':
        const { data: insertData, error: insertError } = await supabase
          .from(table)
          .insert(data)
          .select()
          .single()
        
        if (insertError) {
          return NextResponse.json({ error: insertError }, { status: 400 })
        }
        
        return NextResponse.json({ data: insertData })
      
      case 'select':
        let query = supabase.from(table).select(options?.select || '*')
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (key === 'eq') {
              Object.entries(value as any).forEach(([field, val]) => {
                query = query.eq(field, val)
              })
            }
          })
        }
        
        if (options?.single) {
          query = query.single()
        }
        
        if (options?.limit) {
          query = query.limit(options.limit)
        }
        
        if (options?.order) {
          query = query.order(options.order.column, { ascending: options.order.ascending })
        }
        
        const { data: selectData, error: selectError } = await query
        
        if (selectError) {
          return NextResponse.json({ error: selectError }, { status: 400 })
        }
        
        return NextResponse.json({ data: selectData })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Proxy API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  const table = searchParams.get('table')
  
  if (action === 'test') {
    try {
      const { data, error } = await supabase
        .from('letters')
        .select('count')
        .limit(1)
      
      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        })
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Server-side Supabase connection successful' 
      })
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }
  
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}