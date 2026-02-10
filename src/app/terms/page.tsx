import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function TermsPage() {
  return (
    <main>
      <Header />
      <div className="legal-container">
        <div className="legal-content">
          <h1>Terms of Service</h1>
          <p className="last-updated">Last updated: January 25, 2025</p>
          
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using FlowithMusic ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              FlowithMusic is a platform that allows users to share music with personalized messages. Users can select songs from Spotify, write messages, and share them with others through unique links.
            </p>
          </section>

          <section>
            <h2>3. User Accounts and Registration</h2>
            <p>
              You may use our service anonymously or create an account using Google OAuth. When you create an account, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your account.
            </p>
          </section>

          <section>
            <h2>4. User Content and Conduct</h2>
            <p>
              You are solely responsible for the content you post, including messages and song selections. You agree not to use the service to:
            </p>
            <ul>
              <li>Post harmful, offensive, or inappropriate content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Spam or harass other users</li>
              <li>Attempt to gain unauthorized access to the service</li>
            </ul>
          </section>

          <section>
            <h2>5. Intellectual Property</h2>
            <p>
              The service and its original content, features, and functionality are owned by FlowithMusic and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2>6. Third-Party Services</h2>
            <p>
              Our service integrates with Spotify to provide music streaming capabilities. Your use of Spotify content is subject to Spotify's terms of service and privacy policy.
            </p>
          </section>

          <section>
            <h2>7. Privacy</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices.
            </p>
          </section>

          <section>
            <h2>8. Disclaimers</h2>
            <p>
              The service is provided "as is" without any warranties, expressed or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2>9. Limitation of Liability</h2>
            <p>
              In no event shall FlowithMusic be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2>10. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever.
            </p>
          </section>

          <section>
            <h2>11. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
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