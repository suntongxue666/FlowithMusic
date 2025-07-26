// 颜色提取工具
export class ColorExtractor {
  // 从图片URL提取主色调
  static async extractDominantColor(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            if (!ctx) {
              resolve('#1DB954') // 默认Spotify绿色
              return
            }

            // 设置canvas尺寸
            canvas.width = img.width
            canvas.height = img.height
            
            // 绘制图片
            ctx.drawImage(img, 0, 0)
            
            // 获取图片数据
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data
            
            // 颜色统计
            const colorMap: { [key: string]: number } = {}
            const step = 4 // 每4个像素采样一次，提高性能
            
            for (let i = 0; i < data.length; i += step * 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              const a = data[i + 3]
              
              // 跳过透明像素和过于亮/暗的像素
              if (a < 128 || (r + g + b) < 50 || (r + g + b) > 650) {
                continue
              }
              
              // 量化颜色以减少颜色数量
              const quantizedR = Math.floor(r / 32) * 32
              const quantizedG = Math.floor(g / 32) * 32
              const quantizedB = Math.floor(b / 32) * 32
              
              const colorKey = `${quantizedR},${quantizedG},${quantizedB}`
              colorMap[colorKey] = (colorMap[colorKey] || 0) + 1
            }
            
            // 找到最常见的颜色
            let dominantColor = '29,185,84' // 默认Spotify绿色
            let maxCount = 0
            
            for (const [color, count] of Object.entries(colorMap)) {
              if (count > maxCount) {
                maxCount = count
                dominantColor = color
              }
            }
            
            const [r, g, b] = dominantColor.split(',').map(Number)
            const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
            
            resolve(hexColor)
          } catch (canvasError) {
            console.error('Canvas processing error:', canvasError)
            resolve('#1DB954')
          }
        }
        
        img.onerror = () => {
          console.error('Image load error')
          resolve('#1DB954')
        }
        
        img.src = imageUrl
      } catch (error) {
        console.error('Color extraction error:', error)
        resolve('#1DB954')
      }
    })
  }

  // 生成渐变色
  static generateGradient(baseColor: string): string {
    const hex = baseColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    // 创建更亮和更暗的版本
    const lighterR = Math.min(255, Math.floor(r * 1.3))
    const lighterG = Math.min(255, Math.floor(g * 1.3))
    const lighterB = Math.min(255, Math.floor(b * 1.3))
    
    const darkerR = Math.floor(r * 0.7)
    const darkerG = Math.floor(g * 0.7)
    const darkerB = Math.floor(b * 0.7)
    
    const lighterColor = `rgb(${lighterR}, ${lighterG}, ${lighterB})`
    const darkerColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`
    
    return `linear-gradient(135deg, ${lighterColor}, ${baseColor}, ${darkerColor})`
  }

  // 判断颜色是否为深色
  static isDarkColor(hexColor: string): boolean {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    // 使用亮度公式
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness < 128
  }

  // 获取对比文字颜色
  static getContrastTextColor(backgroundColor: string): string {
    return this.isDarkColor(backgroundColor) ? '#ffffff' : '#000000'
  }
}