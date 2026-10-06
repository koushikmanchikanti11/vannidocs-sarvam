'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Mic2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SignupPage() {
    const router = useRouter()
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fullName }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Signup failed. Please try again.')
                return
            }

            toast.success('Account created! 🎁 5 credits added.')
            router.push('/dashboard')
        } catch {
            toast.error('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
            <Card className="w-full max-w-md p-8 bg-slate-900 border-slate-800">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="p-1.5 rounded-lg bg-indigo-600">
                        <Mic2 className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-white">VaaniDoc</span>
                </div>

                <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
                <p className="text-slate-400 text-sm mb-6">Get 5 free credits on signup 🎁</p>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-slate-300">Full Name</Label>
                        <Input
                            placeholder="Your name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-slate-300">Email</Label>
                        <Input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-slate-300">Password</Label>
                        <Input
                            type="password"
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 mt-2"
                        disabled={loading}
                    >
                        {loading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</>
                        ) : (
                            'Sign Up — Get 5 Free Credits'
                        )}
                    </Button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                        Log in
                    </Link>
                </p>
            </Card>
        </div>
    )
}
