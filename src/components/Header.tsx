import Link from 'next/link'

interface HeaderProps {
  currentPage?: string
}

export default function Header({ currentPage }: HeaderProps) {
  return (
    <header>
      <div className="logo">
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