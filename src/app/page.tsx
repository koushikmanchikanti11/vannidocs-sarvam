import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mic2, FileText, Zap, Globe2, ShieldCheck, Headphones, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    icon: FileText,
    title: 'PDF & Image Support',
    desc: 'Upload PDFs and images in any Indian regional language.',
  },
  {
    icon: Zap,
    title: 'AI-Powered OCR',
    desc: 'Accurate text extraction with Sarvam Vision API.',
  },
  {
    icon: Headphones,
    title: 'Natural Speech',
    desc: 'Listen to documents with Sarvam Bulbul TTS in 12 languages.',
  },
  {
    icon: Globe2,
    title: '12 Indian Languages',
    desc: 'Hindi, Tamil, Telugu, Kannada, Bengali, Malayalam and more.',
  },
  {
    icon: ShieldCheck,
    title: 'Private & Secure',
    desc: 'Your documents are private. Auto-deleted after 30 days.',
  },
  {
    icon: Mic2,
    title: 'Voice Controls',
    desc: 'Speed control, download, and share audio in one click.',
  },
]

const LANGUAGES = ['हिंदी', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ', 'বাংলা', 'മലയാളം', 'ગુજરાતી', 'मराठी', 'ਪੰਜਾਬੀ', 'ଓଡ଼ିଆ', 'অসমীয়া', 'اردو']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500">
            <Mic2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">VaaniDoc</span>
          <Badge className="bg-indigo-600 hover:bg-indigo-600 text-xs">Beta</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-slate-300 hover:text-white" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500" asChild>
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 py-24 max-w-4xl mx-auto">
        <Badge className="bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 mb-6">
          🎁 5 free credits on signup
        </Badge>
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
          Making Indian Documents <br /> Speak Your Language
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
          Upload any PDF or image in Hindi, Tamil, Telugu, and 9 more Indian languages.
          VaaniDoc extracts the text with AI and reads it aloud — making documents accessible for everyone.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-base px-8" asChild>
            <Link href="/signup">
              Try for Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-base" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Language Marquee */}
      <section className="py-8 overflow-hidden border-y border-slate-800/60">
        <div className="flex gap-6 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
          {[...LANGUAGES, ...LANGUAGES].map((lang, i) => (
            <span key={i} className="text-2xl font-semibold text-slate-400 shrink-0">{lang}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">Everything you need</h2>
        <p className="text-slate-400 text-center mb-14">Built specifically for Indian language accessibility</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-700/60 transition-colors">
              <div className="p-2.5 w-fit rounded-xl bg-indigo-900/60 mb-4">
                <f.icon className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-4 py-20">
        <h2 className="text-3xl font-bold mb-4">Start for free today</h2>
        <p className="text-slate-400 mb-8">Get 5 credits on signup. No credit card required.</p>
        <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 px-10" asChild>
          <Link href="/signup">Create Free Account</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} VaaniDoc · Powered by Sarvam AI
      </footer>

    </div>
  )
}
