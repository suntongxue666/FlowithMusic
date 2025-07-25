import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function PrivacyPage() {
  return (
    <main>
      <Header />
      <div className="legal-container">
        <div className="legal-content">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: January 25, 2025</p>
          
          <section>
            <h2>1. Information We Collect</h2>
            <h3>Personal Information</h3>
            <p>
              When you create an account using Google OAuth, we collect:
            </p>
            <ul>
              <li>Your Google account email address</li>
              <li>Your display name</li>
              <li>Your profile picture (if available)</li>
            </ul>
            
            <h3>Usage Information</h3>
            <p>
              We automatically collect certain information when you use our service:
            </p>
            <ul>
              <li>Device information (browser type, operating system)</li>
              <li>Usage patterns and preferences</li>
              <li>IP address and location data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3>Content Information</h3>
            <p>
              We store the content you create on our platform:
            </p>
            <ul>
              <li>Messages you write</li>
              <li>Song selections and preferences</li>
              <li>Letters you create and share</li>
            </ul>
          </section>

          <section>
            <h2>2. How We Use Your Information</h2>
            <p>
              We use the collected information to:
            </p>
            <ul>
              <li>Provide and maintain our service</li>
              <li>Personalize your experience</li>
              <li>Improve our service and develop new features</li>
              <li>Communicate with you about updates and support</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
            </p>
            <ul>
              <li><strong>With your consent:</strong> When you explicitly agree to share information</li>
              <li><strong>Service providers:</strong> With trusted third-party services that help us operate our platform</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2>4. Third-Party Services</h2>
            <h3>Spotify Integration</h3>
            <p>
              Our service integrates with Spotify to provide music streaming. When you use Spotify features, you are subject to Spotify's privacy policy and terms of service.
            </p>
            
            <h3>Google OAuth</h3>
            <p>
              We use Google OAuth for authentication. Your use of Google services is governed by Google's privacy policy.
            </p>

            <h3>Analytics</h3>
            <p>
              We use Google Analytics to understand how users interact with our service. This helps us improve user experience and service performance.
            </p>
          </section>

          <section>
            <h2>5. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information:
            </p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Secure hosting infrastructure</li>
            </ul>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <p>
              We retain your information for as long as necessary to provide our services and comply with legal obligations. You can request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2>7. Your Rights</h2>
            <p>
              Depending on your location, you may have the following rights:
            </p>
            <ul>
              <li>Access to your personal information</li>
              <li>Correction of inaccurate information</li>
              <li>Deletion of your personal information</li>
              <li>Portability of your data</li>
              <li>Objection to processing</li>
              <li>Withdrawal of consent</li>
            </ul>
          </section>

          <section>
            <h2>8. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to:
            </p>
            <ul>
              <li>Remember your preferences</li>
              <li>Analyze usage patterns</li>
              <li>Improve service performance</li>
              <li>Provide personalized content</li>
            </ul>
            <p>
              You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2>9. Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2>11. Changes to Privacy Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "last updated" date.
            </p>
          </section>

          <section>
            <h2>12. Contact Us</h2>
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