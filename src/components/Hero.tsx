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
    </section>
  )
}