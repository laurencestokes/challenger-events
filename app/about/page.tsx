import Header from 'components/Header';
import Footer from 'components/Footer';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      <Header />
      <main>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8">Discover The Challengers</h1>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Challenger Co was born from a simple frustration: why can&apos;t we compare ourselves fairly to anyone, regardless of size, age, or gender?
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              We&apos;re a team of fitness enthusiasts, data scientists, and competitive athletes who believe that true performance should be measured by output, not demographics.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              To break down the barriers in competitive sport and create a truly inclusive fitness community where anyone can challenge anyone.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">The Science Behind Our Scoring</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium mb-2">Allometric Scaling</h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                For strength events, we use allometric scaling to account for body mass differences.
                This scientific approach recognizes that strength doesn&apos;t increase linearly
                with body mass, but rather follows a power law relationship.
              </p>

              <h3 className="text-xl font-medium mb-2">Time-Based Normalization</h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                Endurance events are scored using time-based normalization against elite benchmarks.
                This allows for fair comparison across different endurance disciplines while
                maintaining the integrity of each sport&apos;s unique challenges.
              </p>

              <h3 className="text-xl font-medium mb-2">Demographic Adjustments</h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                Our scoring system includes carefully calibrated adjustments for age, height, and
                sex, based on extensive analysis of elite performance data across different
                demographics.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-center">Our Team</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
                <Image
                  src="/joe_profile.jpg"
                  alt="Profile picture of Joe"
                  width={150}
                  height={150}
                  className="rounded-full mx-auto mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">Joe - Founder</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Former competitive weightlifter and S&C coach. Built Challenger to fix what most fitness competitions get wrong — repetitive formats, outdated divisions, no atmosphere. Joe leads the vision, the format design, and the push to turn data and competition into something people actually care about.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
                <Image
                  src="/ben_profile.jpg"
                  alt="Profile picture of Ben"
                  width={150}
                  height={150}
                  className="rounded-full mx-auto mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">Ben - Founder & Lead Scientist</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  A researcher in experimental physics and the architect of our normalised scoring model. Ben blends deep statistical modelling with a focus on fairness, making it possible to compare performances across age, gender, and body type — without compromise.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Future Development</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
              We&apos;re continuously working to expand Challenger Co with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-lg text-gray-600 dark:text-gray-300">
              <li>Additional event types and scoring algorithms</li>
              <li>Enhanced team management features</li>
              <li>Integrated competition platform</li>
              <li>Advanced analytics and performance tracking</li>
              <li>Global ranking system</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
