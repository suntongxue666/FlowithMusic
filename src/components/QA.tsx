'use client'

export default function QA() {
    const faqs = [
        {
            question: "What is FlowithMusic?",
            answer: "FlowithMusic is a platform where you can send heartfelt handwritten letters paired with your favorite music. We believe that songs carry unsaid words and help connect hearts in a unique way."
        },
        {
            question: "How do I send a musical letter?",
            answer: "Simply go to the 'Send' page, select a song from Spotify, write your message, and choose a category (Love, Friendship, or Family). You can also add flowing emoji effects to make it extra special!"
        },
        {
            question: "Is FlowithMusic free to use?",
            answer: "Yes! Sending basic musical letters is completely free. We also offer premium 'Flowing Emoji' effects for a small fee if you want to add a unique visual touch to your message."
        },
        {
            question: "Can I see letters I've sent before?",
            answer: "Definitely. You can find all your previous messages in the 'History' tab on your dashboard, provided you are using the same device or are logged in."
        },
        {
            question: "Do I need a Spotify account to listen?",
            answer: "You can listen to previews without a Spotify account. To enjoy the full song, we recommend logging into your Spotify account in your browser."
        }
    ]

    return (
        <section className="qa-section" style={{ padding: '80px 20px', backgroundColor: '#fff' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{
                    textAlign: 'center',
                    fontSize: '2.5rem',
                    marginBottom: '50px',
                    fontFamily: "'Caveat', cursive"
                }}>Common Questions</h2>

                <div className="qa-list">
                    {faqs.map((faq, index) => (
                        <div key={index} style={{ marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '10px', color: '#333' }}>
                                Q: {faq.question}
                            </h3>
                            <p style={{ color: '#666', lineHeight: '1.6', fontSize: '1.05rem' }}>
                                {faq.answer}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
