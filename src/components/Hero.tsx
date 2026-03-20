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

      {/* Ko-fi Button - H5 Only */}
      <div className="mobile-only" style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <a href='https://ko-fi.com/U7U01GL6A8' target='_blank' rel='noopener noreferrer'>
          <img height='36' style={{ border: '0px', height: '36px' }} src='https://storage.ko-fi.com/cdn/kofi3.png?v=6' alt='Buy Me a Coffee at ko-fi.com' />
        </a>
      </div>

      {/* H5端分类快速入口 */}
      <div className="h5-categories mobile-only" style={{ justifyContent: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
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
              textDecoration: 'none', color: '#333', fontSize: '13px', fontWeight: '500'
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