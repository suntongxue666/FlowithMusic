interface AnonymousAvatarProps {
  emoji: string
  background: string
  displayName: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function AnonymousAvatar({ 
  emoji, 
  background, 
  displayName, 
  size = 'medium',
  className = '' 
}: AnonymousAvatarProps) {
  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    medium: 'w-12 h-12 text-lg',
    large: 'w-16 h-16 text-2xl'
  }
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold ${className}`}
      style={{ backgroundColor: background }}
      title={displayName}
    >
      {emoji}
    </div>
  )
}