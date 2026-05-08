import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function PrivacyPage() {
  return (
    <main>
      <Header />
      <div className="legal-container">
        <div className="legal-content">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: May 8, 2026</p>
          
          <section>
            <h2>1. Information We Collect</h2>
            <h3>Personal Information</h3>
            <p>
              When you create an account using Google OAuth, we collect your email address, display name, and profile picture.
            </p>
            
            <h3>Payment Information</h3>
            <p>
              We offer paid features through third-party payment processors (Creem and PayPal). When you make a purchase, we do not store your full credit card details or bank account information on our servers. This data is collected and processed directly by our payment providers. We only receive information related to the transaction status (e.g., payment success, transaction ID) to activate your Premium features.
            </p>

            <h3>Music Preferences and Soulmate Data</h3>
            <p>
              To provide the "Music Soulmate" feature, we collect data about your favorite artists and song preferences. This information is used to match you with other users who share similar musical interests. You may choose to hide or limit the visibility of this information in your account settings.
            </p>

            <h3>Usage and Content Information</h3>
            <p>
              We automatically collect device information, usage patterns, and the content you create (such as Letters and messages) to provide and improve our service.
            </p>
          </section>

          <section>
            <h2>2. How We Use Your Information</h2>
            <p>
              We use the collected information to:
            </p>
            <ul>
              <li>Provide and maintain our service, including Premium subscriptions</li>
              <li>Match you with potential "Music Soulmates"</li>
              <li>Improve user experience and develop new musical features</li>
              <li>Communicate updates and provide customer support</li>
              <li>Ensure security and prevent fraudulent transactions</li>
            </ul>
          </section>

          <section>
            <h2>3. Information Sharing</h2>
            <p>
              We do not sell your personal information. We may share data with trusted service providers (like payment processors) to facilitate the service, or when required by law.
            </p>
          </section>

          <section>
            <h2>4. Third-Party Services</h2>
            <p>
              Our service integrates with Spotify, Google, PayPal, and Creem. Each of these services has its own privacy policy which governs their use of your data.
            </p>
          </section>

          <section>
            <h2>5. Data Security</h2>
            <p>
              We implement industry-standard security measures, including encryption and access controls, to protect your information.
            </p>
          </section>

          <section>
            <h2>6. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal information. You can manage your account data through your settings or contact us for assistance.
            </p>
          </section>

          <section>
            <h2>7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
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