import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | Challenger Co',
  description: 'Privacy Policy for Challenger Co platform',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Information We Collect
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We collect information you provide directly to us, such as when you create an
                account, participate in events, or contact us for support.
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Personal Information
              </h3>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Name and email address</li>
                <li>Profile information and preferences</li>
                <li>Performance data and workout results</li>
                <li>Team membership and event participation</li>
                <li>Communication preferences</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. How We Use Your Information
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Create and maintain leaderboards and rankings</li>
                <li>Facilitate team competitions and events</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Information Sharing
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third
                parties without your consent, except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>In connection with a business transfer or acquisition</li>
                <li>
                  With service providers who assist in our operations (under strict confidentiality
                  agreements)
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Data Security
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We implement appropriate security measures to protect your personal information
                against unauthorized access, alteration, disclosure, or destruction. However, no
                method of transmission over the internet or electronic storage is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Cookies and Tracking
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We use cookies and similar tracking technologies to enhance your experience on our
                platform. For detailed information about our cookie usage, please see our Cookie
                Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Your Rights
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Depending on your location, you may have certain rights regarding your personal
                information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Access to your personal information</li>
                <li>Correction of inaccurate information</li>
                <li>Deletion of your personal information</li>
                <li>Portability of your data</li>
                <li>Objection to processing</li>
                <li>Withdrawal of consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Data Retention
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We retain your personal information for as long as necessary to provide our
                services, comply with legal obligations, resolve disputes, and enforce our
                agreements. When we no longer need your information, we will securely delete or
                anonymize it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Children's Privacy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Our service is not intended for children under 18 years of age. We do not knowingly
                collect personal information from children under 18. If you are a parent or guardian
                and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. International Data Transfers
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Your information may be transferred to and processed in countries other than your
                own. We ensure that such transfers comply with applicable data protection laws and
                implement appropriate safeguards.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page and updating the "Last
                updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Contact Us
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please
                contact us at:
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Challenger Co</strong>
                  <br />
                  Email: privacy@thechallengerco.com
                  <br />
                  Website: https://thechallengerco.com
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
