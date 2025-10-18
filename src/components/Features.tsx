export default function Features() {
  const features = [
    {
      title: "Share Your Message",
      description: "Write a heartfelt message with a track that speaks for you."
    },
    {
      title: "Detail Messages", 
      description: "Handwritten feeling. Emotion that lives in your letters."
    },
    {
      title: "Browse Messages",
      description: "Explore messages from others and find kindred souls."
    }
  ]

  return (
    <section className="features">
      {features.map((feature, index) => (
        <div key={index} className="feature-box">
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
      ))}
    </section>
  )
}