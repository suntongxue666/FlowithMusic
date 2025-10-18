'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugDbSchemaPage() {
  const [schema, setSchema] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSchema = async () => {
      try {
        if (!supabase) {
          throw new Error('Supabase客户端不可用')
        }

        console.log('🔍 检查users表结构...')
        
        // 查询一个用户记录来查看字段结构
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .limit(1)
        
        if (usersError) {
          throw new Error(`查询失败: ${usersError.message}`)
        }
        
        console.log('👤 用户表数据示例:', users)
        
        if (users && users.length > 0) {
          const sampleUser = users[0]
          const fields = Object.keys(sampleUser)
          
          setSchema({
            sampleUser,
            fields,
            hasSocialMediaInfo: fields.includes('social_media_info'),
            socialMediaInfoType: typeof sampleUser.social_media_info,
            socialMediaInfoValue: sampleUser.social_media_info
          })
        } else {
          setSchema({
            message: '没有找到用户数据',
            fields: []
          })
        }
        
      } catch (err: any) {
        console.error('❌ 检查失败:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkSchema()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>数据库表结构检查</h1>
        <p>加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>数据库表结构检查</h1>
        <p style={{ color: 'red' }}>错误: {error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Users表结构检查结果</h1>
      
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>📋 表字段列表</h2>
        <ul>
          {schema?.fields?.map((field: string) => (
            <li key={field} style={{ 
              color: field === 'social_media_info' ? 'green' : 'black',
              fontWeight: field === 'social_media_info' ? 'bold' : 'normal'
            }}>
              {field}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>🔍 Social Media Info 检查</h2>
        <p><strong>是否存在 social_media_info 字段:</strong> {schema?.hasSocialMediaInfo ? '✅ 是' : '❌ 否'}</p>
        <p><strong>字段类型:</strong> {schema?.socialMediaInfoType}</p>
        <p><strong>字段值:</strong></p>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(schema?.socialMediaInfoValue, null, 2)}
        </pre>
      </div>

      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>📄 示例用户数据</h2>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(schema?.sampleUser, null, 2)}
        </pre>
      </div>
    </div>
  )
}