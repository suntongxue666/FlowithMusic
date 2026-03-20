import Link from 'next/link'

export default function Hero() {
  return (
    <section className="hero">
      <h1>Songs carry your unsaid words — that connects hearts.</h1>
      <p>
        Pick a song and write a message — send it to an old friend or find someone new who feels the same tune.
      </p>
      <div className="hero-buttons">
        <Link href="/send" className="btn btn-primary">
          💌 Send a Song
        </Link>
        <Link href="/explore" className="btn btn-secondary">
          🔍 Explore Letters
        </Link>
      </div>

      {/* Buttons: Premium & Ko-fi (Visible on both PC & H5) */}
      <div className="hero-interaction-row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
        <Link 
          href="/premium" 
          className="text-[12px] font-bold text-white bg-[#ff9800] rounded-full hover:scale-105 transition-transform flex items-center justify-center"
          style={{ padding: '8px 16px', minWidth: '100px', height: '36px', textDecoration: 'none' }}
        >
          👑 Premium-No ads
        </Link>
        <a href='https://ko-fi.com/U7U01GL6A8' target='_blank' rel='noopener noreferrer' style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
          <img height='36' style={{ border: '0px', height: '36px', verticalAlign: 'middle' }} src='https://storage.ko-fi.com/cdn/kofi3.png?v=6' alt='Buy Me a Coffee at ko-fi.com' />
        </a>
      </div>

      {/* H5端分类快速入口 */}
      <div className="h5-categories mobile-only" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
        {[
          { id: 'Love', label: 'Love', link: '/love', icon: '❤️' },
          { id: 'Friendship', label: 'Friendship', link: '/friendship', icon: '🤝' },
          { id: 'Family', label: 'Family', link: '/family', icon: '🏠' }
        ].map(cat => (
          <a
            href={cat.link}
            key={cat.id}
            className="h5-cat-link"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
              borderRadius: '25px', background: 'white', border: '1px solid #eee',
              textDecoration: 'none', color: '#333', fontSize: '13px', fontWeight: '500',
              width: 'auto'
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </a>
        ))}
      </div>
    </section>
  )
}