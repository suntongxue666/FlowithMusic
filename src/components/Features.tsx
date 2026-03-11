export default function Features() {
  const features = [
    {
      title: "❤️ Love Letters",
      description: "Explore romantic handwritten letters paired with meaningful songs.",
      link: "/love"
    },
    {
      title: "🤝 Friendship Letters",
      description: "Discover messages of appreciation and shared memories between friends.",
      link: "/friendship"
    },
    {
      title: "🏠 Family Letters",
      description: "Heartfelt letters to parents, siblings, and relatives that bridge the distance.",
      link: "/family"
    }
  ]

  return (
    <section className="features">
      {features.map((feature, index) => (
        <a href={feature.link} key={index} className="feature-box" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </a>
      ))}
    </section>
  )
}