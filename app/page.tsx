import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Search,
  Code2,
  BarChart3,
  Shield,
  Users,
  Zap,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

export const metadata = {
  title: 'Linksy — Connect People to the Resources They Need',
  description:
    'Linksy helps social service organizations manage referrals, build resource directories, and embed AI-powered search tools on their websites.',
}

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600 tracking-tight">Linksy</span>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <Link href="/find-help" className="hover:text-gray-900 transition-colors">Find Help</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/join/provider"
              className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="h-3.5 w-3.5" />
            AI-powered community resource matching
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
            Connect People to the{' '}
            <span className="text-blue-600">Resources They Need</span>
          </h1>
          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Linksy helps social service organizations manage referrals, maintain provider
            directories, and embed a smart resource-finder on any website — in minutes.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/find-help"
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-7 py-3.5 rounded-lg text-base font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Search className="h-4 w-4" />
              Find Resources Near You
            </Link>
            <Link
              href="/join/provider"
              className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-7 py-3.5 rounded-lg text-base font-semibold hover:bg-gray-50 transition-colors"
            >
              Join as an Organization
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need to connect your community</h2>
            <p className="mt-3 text-lg text-gray-500">Built for nonprofits, social service agencies, and community organizations.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Search className="h-6 w-6 text-blue-600" />,
                title: 'AI-Powered Search',
                description:
                  'Natural language search understands what people need, not just keywords. Matches needs to local providers with semantic AI and geographic proximity.',
              },
              {
                icon: <Code2 className="h-6 w-6 text-blue-600" />,
                title: 'Embeddable Widget',
                description:
                  'Add a fully branded resource finder to any website with one line of code. Customizable colors, fonts, and welcome messages. Works in any iframe.',
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
                title: 'Referral Tracking',
                description:
                  'Create, manage, and track service referrals. Follow up on outcomes, measure resolution times, and see exactly where your community&apos;s needs are going unmet.',
              },
              {
                icon: <Shield className="h-6 w-6 text-blue-600" />,
                title: 'Crisis Detection',
                description:
                  'Automatic detection of crisis-related queries triggers emergency resource banners with hotline numbers — keeping vulnerable users safe during search.',
              },
              {
                icon: <Users className="h-6 w-6 text-blue-600" />,
                title: 'Provider Directory',
                description:
                  'Maintain a rich, structured directory of service providers with locations, hours, needs served, and contact info. Import legacy data in bulk.',
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
                title: 'Analytics Dashboard',
                description:
                  'Track search sessions, referral conversions, provider engagement, and crisis detections. See which zip codes need more resources.',
              },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
            <p className="mt-3 text-lg text-gray-500">Two ways to use Linksy — pick the one that fits your role.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            {/* For Organizations */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">For Service Providers</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Get listed. Receive referrals.</h3>
              <ul className="space-y-3">
                {[
                  'Submit your organization to be listed in the directory',
                  'Manage your profile, locations, and services offered',
                  'Receive referral tickets from AI-assisted searches',
                  'Track outcomes and communicate with clients',
                  'View engagement analytics for your profile',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/join/provider"
                className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Request to Be Listed <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* For Hosts */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-3">For Host Organizations</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Embed on your site. Help your visitors.</h3>
              <ul className="space-y-3">
                {[
                  'Embed a resource finder on your website or platform',
                  'Fully branded to match your colors, logo, and voice',
                  'Powered by the same AI search your users will love',
                  'Track searches and referral conversions in your dashboard',
                  'Budget controls to manage monthly AI usage',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/join/host"
                className="mt-6 inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
              >
                Request Widget Access <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to make a difference?</h2>
          <p className="text-blue-100 text-lg mb-8">
            Join the organizations already using Linksy to connect their communities with the help they need.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/join/provider"
              className="bg-white text-blue-600 px-7 py-3.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
            >
              Join as a Provider
            </Link>
            <Link
              href="/join/host"
              className="border border-blue-400 text-white px-7 py-3.5 rounded-lg font-semibold hover:bg-blue-500 transition-colors text-sm"
            >
              Embed on Your Site
            </Link>
            <Link
              href="/login"
              className="border border-blue-400 text-white px-7 py-3.5 rounded-lg font-semibold hover:bg-blue-500 transition-colors text-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-white font-bold text-lg">Linksy</span>
          <div className="flex gap-6 text-sm">
            <Link href="/find-help" className="hover:text-white transition-colors">Find Help</Link>
            <Link href="/join/provider" className="hover:text-white transition-colors">For Providers</Link>
            <Link href="/join/host" className="hover:text-white transition-colors">For Organizations</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <p className="text-sm">&copy; {new Date().getFullYear()} Linksy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
