import Header from 'components/Header';
import Footer from 'components/Footer';
import Link from 'next/link';

export default function ShowdownPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-black">
            <Header />
            <main>
                {/* Hero Section */}
                <section className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black py-16">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
                            ENTER THE SHOWDOWN
                        </h1>
                        <p className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 mb-8">
                            A new era in fitness events
                        </p>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Where anyone can compete against anyone. No barriers. No excuses. Just pure performance.
                        </p>
                    </div>
                </section>

                {/* Event Details */}
                <section className="py-16 bg-white dark:bg-gray-900">
                    <div className="max-w-4xl mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                                The Ultimate Fitness Challenge
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-300">
                                Coming soon - be the first to know when registration opens.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
                                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                                    What is The Showdown?
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                    The Showdown is a revolutionary fitness competition that eliminates traditional categories and divisions.
                                    Using our Challenger Score system, athletes of all sizes, ages, and backgrounds compete on a truly level playing field.
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Whether you&apos;re a powerlifter, CrossFit athlete, or weekend warrior, your performance is measured purely on output, not demographics.
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
                                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                                    How It Works
                                </h3>
                                <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                                    <li className="flex items-start">
                                        <span className="text-red-500 font-bold mr-2">1.</span>
                                        Register and submit your Challenger Score
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-red-500 font-bold mr-2">2.</span>
                                        Compete in events designed to test all fitness domains
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-red-500 font-bold mr-2">3.</span>
                                        Your performance is normalized using our scoring system
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-red-500 font-bold mr-2">4.</span>
                                        Compete directly against athletes of all backgrounds
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Event Types */}
                <section className="py-16 bg-gray-50 dark:bg-gray-800">
                    <div className="max-w-4xl mx-auto px-4">
                        <h2 className="text-3xl lg:text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">
                            Event Categories
                        </h2>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
                                <div className="text-4xl mb-4">💪</div>
                                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Strength Events</h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Powerlifting-style events with normalized scoring based on body weight and demographics.
                                </p>
                            </div>

                            <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
                                <div className="text-4xl mb-4">🏃</div>
                                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Endurance Events</h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Cardiovascular challenges with time-based normalization against elite benchmarks.
                                </p>
                            </div>

                            <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
                                <div className="text-4xl mb-4">⚡</div>
                                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Hybrid Events</h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Multi-modal challenges that test strength, endurance, and tactical decision-making.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Registration CTA */}
                <section className="py-16 bg-white dark:bg-gray-900">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                            Ready to Challenge Anyone?
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                            Get your Challenger Score first, then join us for the ultimate fitness showdown.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/formula"
                                className="inline-block px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg"
                            >
                                Get Your Score
                            </Link>
                            <Link
                                href="/about"
                                className="inline-block px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-lg"
                            >
                                Learn More
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
} 