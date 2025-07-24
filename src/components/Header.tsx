import Link from 'next/link'

interface HeaderProps {
  currentPage?: string
}

export default function Header({ currentPage }: HeaderProps) {
  return (
    <header>
      <div className="logo">
        <img 
          src="https://ciwjjfcuhubjydajazkk.supabase.co/storage/v1/object/public/webstie-icon//FlowtithMusic-100.png" 
          alt="FlowithMusic" 
          width={32} 
          height={32}
        />
        FlowithMusic
      </div>
      <nav>
        <Link href="/" className={currentPage === 'home' ? 'active' : ''}>Home</Link>
        <Link href="/send" className={currentPage === 'send' ? 'active' : ''}>Send</Link>
        <Link href="/explore" className={currentPage === 'explore' ? 'active' : ''}>Explore</Link>
        <Link href="/history" className={currentPage === 'history' ? 'active' : ''}>History</Link>
      </nav>
    </header>
  )
}