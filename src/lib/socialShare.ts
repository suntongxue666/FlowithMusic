// Letter分享和社交媒体集成工具
import { Letter } from '@/lib/supabase'

export interface ShareOptions {
  platform: 'copy' | 'whatsapp' | 'telegram' | 'twitter' | 'facebook' | 'email' | 'sms'
  letter: Letter
  customMessage?: string
}

export class SocialShareService {
  private static baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.flowithmusic.com'

  // 生成分享链接
  static generateShareUrl(linkId: string): string {
    return `${this.baseUrl}/letter/${linkId}`
  }

  // 生成分享文本
  static generateShareText(letter: Letter, customMessage?: string): string {
    if (customMessage) {
      return customMessage
    }

    return `🎵 ${letter.recipient_name}，我为你创建了一封音乐信件！\n\n歌曲：${letter.song_title} - ${letter.song_artist}\n\n点击链接查看完整信件：`
  }

  // 复制到剪贴板
  static async copyToClipboard(letter: Letter, customMessage?: string): Promise<boolean> {
    try {
      const shareUrl = this.generateShareUrl(letter.link_id)
      const shareText = this.generateShareText(letter, customMessage)
      const fullText = `${shareText}\n${shareUrl}`

      await navigator.clipboard.writeText(fullText)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  // WhatsApp分享
  static shareToWhatsApp(letter: Letter, customMessage?: string): void {
    const shareUrl = this.generateShareUrl(letter.link_id)
    const shareText = this.generateShareText(letter, customMessage)
    const fullText = encodeURIComponent(`${shareText}\n${shareUrl}`)
    
    const whatsappUrl = `https://wa.me/?text=${fullText}`
    window.open(whatsappUrl, '_blank')
  }

  // Telegram分享
  static shareToTelegram(letter: Letter, customMessage?: string): void {
    const shareUrl = this.generateShareUrl(letter.link_id)
    const shareText = this.generateShareText(letter, customMessage)
    
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    window.open(telegramUrl, '_blank')
  }

  // Twitter分享
  static shareToTwitter(letter: Letter, customMessage?: string): void {
    const shareUrl = this.generateShareUrl(letter.link_id)
    const shareText = this.generateShareText(letter, customMessage)
    const tweetText = `${shareText}\n${shareUrl}`
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
    window.open(twitterUrl, '_blank')
  }

  // Facebook分享
  static shareToFacebook(letter: Letter): void {
    const shareUrl = this.generateShareUrl(letter.link_id)
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(facebookUrl, '_blank')
  }

  // 邮件分享
  static shareToEmail(letter: Letter, customMessage?: string): void {
    const shareUrl = this.generateShareUrl(letter.link_id)
    const shareText = this.generateShareText(letter, customMessage)
    const subject = encodeURIComponent(`🎵 ${letter.recipient_name}，为你准备的音乐信件`)
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`)
    
    const emailUrl = `mailto:?subject=${subject}&body=${body}`
    window.location.href = emailUrl
  }

  // 短信分享
  static shareToSMS(letter: Letter, customMessage?: string): void {
    const shareUrl = this.generateShareUrl(letter.link_id)
    const shareText = this.generateShareText(letter, customMessage)
    const fullText = `${shareText}\n${shareUrl}`
    
    const smsUrl = `sms:?body=${encodeURIComponent(fullText)}`
    window.location.href = smsUrl
  }

  // 通用分享方法
  static async share(options: ShareOptions): Promise<boolean> {
    const { platform, letter, customMessage } = options

    try {
      switch (platform) {
        case 'copy':
          return await this.copyToClipboard(letter, customMessage)
        case 'whatsapp':
          this.shareToWhatsApp(letter, customMessage)
          return true
        case 'telegram':
          this.shareToTelegram(letter, customMessage)
          return true
        case 'twitter':
          this.shareToTwitter(letter, customMessage)
          return true
        case 'facebook':
          this.shareToFacebook(letter)
          return true
        case 'email':
          this.shareToEmail(letter, customMessage)
          return true
        case 'sms':
          this.shareToSMS(letter, customMessage)
          return true
        default:
          console.error('Unsupported share platform:', platform)
          return false
      }
    } catch (error) {
      console.error('Share failed:', error)
      return false
    }
  }

  // 检测用户设备和推荐最佳分享方式
  static getRecommendedSharePlatforms(): string[] {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)

    if (isIOS) {
      return ['copy', 'whatsapp', 'telegram', 'twitter', 'email', 'sms']
    } else if (isAndroid) {
      return ['copy', 'whatsapp', 'telegram', 'twitter', 'facebook', 'sms']
    } else {
      return ['copy', 'whatsapp', 'telegram', 'twitter', 'facebook', 'email']
    }
  }

  // 生成分享统计数据
  static async trackShare(letter: Letter, platform: string): Promise<void> {
    try {
      // 可以添加分享统计逻辑
      console.log(`📊 Share tracked: ${letter.link_id} via ${platform}`)
      
      // 如果需要，可以发送到分析服务
      // analytics.track('letter_shared', { linkId: letter.link_id, platform })
    } catch (error) {
      console.error('Failed to track share:', error)
    }
  }
}