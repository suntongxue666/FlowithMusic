import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function TermsPage() {
  return (
    <main>
      <Header />
      <div className="legal-container">
        <div className="legal-content">
          <h1>Terms of Service</h1>
          <p className="last-updated">Last updated: May 8, 2026</p>
          
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using FlowithMusic ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              FlowithMusic is a musical social platform that allows users to share music with personalized messages ("Letters") and discover "Music Soulmates" based on shared artist preferences.
            </p>
          </section>

          <section>
            <h2>3. Subscriptions and Payments</h2>
            <p>
              We offer both one-time passes and recurring subscription plans ("Premium"). 
            </p>
            <ul>
              <li><strong>One-time Passes:</strong> Non-recurring payments (e.g., 30 Days Pass) that provide access for a fixed duration. These do not auto-renew.</li>
              <li><strong>Subscriptions:</strong> Recurring plans that automatically renew at the end of each billing cycle (monthly or annually) unless cancelled.</li>
              <li><strong>Payment Processors:</strong> We use third-party processors including PayPal and Creem (supporting Alipay and WeChat Pay). By making a purchase, you agree to their respective terms.</li>
            </ul>
          </section>

          <section>
            <h2>4. Refund Policy</h2>
            <p>
              Due to the nature of digital content and immediate access to Premium features, all purchases are generally non-refundable. If you have concerns about a specific transaction, please contact our support team. For subscriptions, you may cancel at any time to prevent future billing.
            </p>
          </section>

          <section>
            <h2>5. Music Soulmate Feature</h2>
            <p>
              The Music Soulmate feature matches users based on shared musical interests. By using this feature, you understand that other users may see your shared musical preferences (such as favorite artists) to facilitate connection.
            </p>
          </section>

          <section>
            <h2>6. User Accounts and Registration</h2>
            <p>
              You may use our service anonymously or create an account using Google OAuth. You are responsible for maintaining the confidentiality of your account credentials.
            </p>
          </section>

          <section>
            <h2>7. User Content and Conduct</h2>
            <p>
              You are solely responsible for the content you post, including messages in Letters. You agree not to post harmful, offensive, or illegal content.
            </p>
          </section>

          <section>
            <h2>8. Intellectual Property</h2>
            <p>
              The service and its original content, features, and functionality are owned by FlowithMusic and are protected by international copyright laws.
            </p>
          </section>

          <section>
            <h2>9. Third-Party Services</h2>
            <p>
              Our service integrates with Spotify. Your use of Spotify content is subject to Spotify's Terms of Service and Privacy Policy.
            </p>
          </section>

          <section>
            <h2>10. Disclaimers</h2>
            <p>
              The service is provided "as is" without any warranties. We do not guarantee that the service will be uninterrupted or error-free.
            </p>
          </section>

          <section>
            <h2>11. Limitation of Liability</h2>
            <p>
              FlowithMusic shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2>12. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
              <br />
              Email: <a href="mailto:tiktreeapp@gmail.com">tiktreeapp@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}