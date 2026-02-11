import Link from 'next/link';
import Image from 'next/image';

export default function FirefoxExtensionPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <Image src="/extensions/store-icon-128.png" width={80} height={80} alt="Extension Icon" className="rounded-2xl shadow-md" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                        Install Firefox Add-on
                    </h1>
                    <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
                        Easily copy your Cisco Spaces Session Token with one click.
                    </p>
                </div>

                <div className="flex justify-center">
                    <a
                        href="/extensions/firefox-release-v3.zip"
                        download
                        className="group relative w-full flex justify-center py-4 px-8 border border-transparent text-lg font-medium rounded-full text-white bg-orange-600 hover:bg-orange-700 md:w-auto md:text-xl shadow-lg transform transition hover:-translate-y-1"
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <svg className="h-6 w-6 text-orange-300 group-hover:text-orange-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </span>
                        Download Add-on (ZIP)
                    </a>
                </div>

                <div className="mt-12 bg-orange-50 rounded-xl p-8 border border-orange-100">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-600 text-white text-sm font-bold mr-3">!</span>
                                Installation Steps
                            </h3>
                            <ol className="space-y-6">
                                <li className="flex items-start">
                                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-orange-200 text-orange-600 font-bold mr-4 bg-white shadow-sm">1</span>
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900">Open Debugging Page</h4>
                                        <p className="text-gray-600">Go to <code className="bg-white px-2 py-0.5 rounded border border-gray-200 font-mono text-sm text-orange-600">about:debugging</code> in a new tab.</p>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-orange-200 text-orange-600 font-bold mr-4 bg-white shadow-sm">2</span>
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900">Select "This Firefox"</h4>
                                        <p className="text-gray-600">Click on "This Firefox" in the sidebar menu.</p>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-orange-200 text-orange-600 font-bold mr-4 bg-white shadow-sm">3</span>
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900">Load Temporary Add-on</h4>
                                        <p className="text-gray-600">Click "Load Temporary Add-on..." and select the downloaded <code className="bg-white px-2 py-0.5 rounded border border-gray-200 font-mono text-sm">firefox-release-v3.zip</code> file.</p>
                                    </div>
                                </li>
                            </ol>
                        </div>
                        <div className="flex-1 w-full relative">
                            <div className="aspect-w-16 aspect-h-10 rounded-lg overflow-hidden shadow-2xl ring-1 ring-black ring-opacity-5">
                                <Image src="/extensions/promo-1280x800.jpg" alt="Extension Promo" width={600} height={400} className="object-cover" />
                            </div>
                            <p className="mt-2 text-center text-sm text-gray-400">Extension Preview</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mt-8">
                    <Link href="/" className="text-orange-600 hover:text-orange-800 font-medium flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
