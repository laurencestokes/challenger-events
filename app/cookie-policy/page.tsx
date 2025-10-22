import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Cookie Policy | Challenger Co',
  description: 'Cookie Policy for Challenger Co platform',
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Cookie Policy</h1>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. What Are Cookies
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Cookies are small text files that are placed on your computer or mobile device when
                you visit our website. They are widely used to make websites work more efficiently
                and to provide information to website owners.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Cookies allow us to recognize your device and store some information about your
                preferences or past actions. This helps us provide you with a better experience when
                you browse our website and also allows us to improve our site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. How We Use Cookies
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We use cookies for several purposes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>To keep you signed in to your account</li>
                <li>To remember your preferences and settings</li>
                <li>To understand how you use our website</li>
                <li>To improve our website's performance</li>
                <li>To provide personalized content and features</li>
                <li>To analyze website traffic and usage patterns</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Types of Cookies We Use
              </h2>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Essential Cookies
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  These cookies are necessary for the website to function properly. They enable
                  basic functions like page navigation, access to secure areas, and authentication.
                  The website cannot function properly without these cookies.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Examples:</strong> Session cookies, authentication cookies, security
                    cookies
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Performance Cookies
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  These cookies collect information about how visitors use our website, such as
                  which pages are visited most often and if visitors get error messages. This helps
                  us improve how our website works.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Examples:</strong> Google Analytics cookies, performance monitoring
                    cookies
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Functionality Cookies
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  These cookies allow the website to remember choices you make and provide enhanced,
                  more personal features. They may also be used to provide services you have
                  requested.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Examples:</strong> Language preferences, theme settings, user interface
                    preferences
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Third-Party Cookies
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Some cookies on our website are set by third-party services. These may include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Social media platforms for sharing features</li>
                <li>Payment processors for transaction processing</li>
                <li>Content delivery networks for faster loading</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                These third parties have their own privacy policies and cookie policies. We
                recommend reviewing their policies for more information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Managing Cookies
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                You can control and manage cookies in several ways:
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Browser Settings
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Most web browsers allow you to control cookies through their settings preferences.
                You can set your browser to refuse cookies or delete certain cookies. However, if
                you choose to delete or refuse cookies, some features of our website may not
                function properly.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Cookie Consent
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                When you first visit our website, you may see a cookie consent banner. You can
                choose which types of cookies you want to accept. You can change your preferences at
                any time through our cookie settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Cookie Duration
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Cookies can be either "session" cookies or "persistent" cookies:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>
                  <strong>Session cookies:</strong> These are temporary cookies that expire when you
                  close your browser
                </li>
                <li>
                  <strong>Persistent cookies:</strong> These remain on your device for a set period
                  or until you delete them
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Updates to This Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our
                practices or for other operational, legal, or regulatory reasons. We will notify you
                of any material changes by posting the updated policy on our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Contact Us
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                If you have any questions about our use of cookies or this Cookie Policy, please
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
