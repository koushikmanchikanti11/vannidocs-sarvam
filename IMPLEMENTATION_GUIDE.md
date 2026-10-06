# VaaniDoc - Quick Implementation Guide

## 🚀 Step-by-Step Setup

### Phase 1: Project Setup (Day 1)

#### 1. Initialize Next.js Project
```bash
npx create-next-app@latest vaanidoc --typescript --tailwind --app
cd vaanidoc
```

#### 2. Install Dependencies
```bash
# Core dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# UI Components (shadcn/ui)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input select dropdown-menu avatar badge progress skeleton toast

# Form & State Management
npm install react-hook-form @hookform/resolvers zod
npm install zustand

# Utilities
npm install clsx tailwind-merge
npm install lucide-react
npm install date-fns

# Security
npm install isomorphic-dompurify validator
```

#### 3. Setup Supabase
```bash
# Go to supabase.com and create a project
# Copy your project URL and anon key
# Add to .env.local:

NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
```

#### 4. Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  credits_remaining DECIMAL DEFAULT 5,
  total_credits_used DECIMAL DEFAULT 0,
  signup_bonus_claimed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('pdf', 'image')),
  file_size INTEGER NOT NULL,
  language TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')) DEFAULT 'uploaded',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extractions table
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  extracted_text TEXT,
  word_count INTEGER,
  extraction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sarvam_request_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio files table
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  voice_provider TEXT CHECK (voice_provider IN ('sarvam', 'elevenlabs')),
  voice_id TEXT,
  duration_seconds INTEGER,
  character_count INTEGER,
  synthesis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions table
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT CHECK (transaction_type IN ('signup_bonus', 'ocr_deduction', 'tts_deduction', 'refund', 'admin_grant')),
  amount DECIMAL NOT NULL,
  balance_after DECIMAL NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage logs table
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT CHECK (action_type IN ('ocr', 'tts')),
  api_provider TEXT CHECK (api_provider IN ('sarvam', 'elevenlabs')),
  credits_used DECIMAL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API requests table (for rate limiting)
CREATE TABLE api_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_extractions_document_id ON extractions(document_id);
CREATE INDEX idx_audio_files_extraction_id ON audio_files(extraction_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_api_requests_user_time ON api_requests(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own extractions" ON extractions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM documents WHERE documents.id = extractions.document_id AND documents.user_id = auth.uid()));

CREATE POLICY "Users can view own audio" ON audio_files FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM extractions e
    JOIN documents d ON d.id = e.document_id
    WHERE e.id = audio_files.extraction_id AND d.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own logs" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own api requests" ON api_requests FOR SELECT USING (auth.uid() = user_id);

-- Cleanup function for old API requests (optional but recommended)
CREATE OR REPLACE FUNCTION cleanup_old_api_requests()
RETURNS void AS $$
BEGIN
  DELETE FROM api_requests 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- You can schedule this with pg_cron or call it manually
-- SELECT cleanup_old_api_requests();
```

#### 5. Create Storage Buckets

In Supabase Storage, create two buckets:
- `documents` (for PDFs/images)
- `audio` (for generated audio files)

Set both to **private** and add RLS policies:

```sql
-- Documents bucket policy
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Audio bucket policy
CREATE POLICY "Users can upload own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

### Phase 2: Core Implementation (Day 2-3)

#### 1. Setup Supabase Client

Create `src/lib/supabase/client.ts`:
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () => createClientComponentClient()
```

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createClient = () => createServerComponentClient({ cookies })
```

#### 2. Setup Middleware

Create `src/middleware.ts`:
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/convert/:path*', '/history/:path*', '/login', '/signup']
}
```

#### 3. Setup API Middleware

Create `src/lib/middleware/apiMiddleware.ts`:
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Authentication middleware
export async function withAuth(handler: Function) {
  return async (req: Request) => {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return handler(req, session, supabase)
  }
}

// Rate limiting using Supabase
export async function withRateLimit(supabase: any, userId: string, limit = 10) {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
  
  // Count requests in last minute
  const { count } = await supabase
    .from('api_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgo)
  
  if (count >= limit) {
    return NextResponse.json({
      error: 'Rate limit exceeded',
      limit,
      retryAfter: '1 minute'
    }, { status: 429 })
  }
  
  // Log this request
  await supabase
    .from('api_requests')
    .insert({ 
      user_id: userId,
      endpoint: new URL(req.url).pathname,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })
  
  return null
}

// Credit validation
export async function withCredits(supabase: any, userId: string, requiredCredits: number) {
  const { data: user } = await supabase
    .from('users')
    .select('credits_remaining')
    .eq('id', userId)
    .single()
    
  if (!user || user.credits_remaining < requiredCredits) {
    return NextResponse.json({ 
      error: 'Insufficient credits',
      required: requiredCredits,
      available: user?.credits_remaining || 0
    }, { status: 402 })
  }
  
  return null
}

// Combined middleware pipeline
export function createAPIHandler(config: {
  requiredCredits?: number
  rateLimit?: boolean
  rateLimitCount?: number
}) {
  return (handler: Function) => {
    return withAuth(async (req: Request, session: any, supabase: any) => {
      // Rate limiting
      if (config.rateLimit !== false) {
        const rateLimitResult = await withRateLimit(
          supabase, 
          session.user.id, 
          config.rateLimitCount || 10
        )
        if (rateLimitResult) return rateLimitResult
      }
      
      // Credit validation
      if (config.requiredCredits) {
        const creditResult = await withCredits(
          supabase,
          session.user.id,
          config.requiredCredits
        )
        if (creditResult) return creditResult
      }
      
      return handler(req, session, supabase)
    })
  }
}
```

---

### Phase 3: Authentication (Day 4)

#### Create Signup Page

`src/app/(auth)/signup/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Call your signup API endpoint that handles credit bonus
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName })
    })

    if (response.ok) {
      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6">Sign Up - Get 5 Free Credits! 🎁</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
```

#### Create Signup API Endpoint

`src/app/api/auth/signup/route.ts`:
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email, password, fullName } = await req.json()
  const supabase = createRouteHandlerClient({ cookies })

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Create user profile with 5 credits
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user!.id,
      email,
      full_name: fullName,
      credits_remaining: 5,
      signup_bonus_claimed: true
    })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // Log credit transaction
  await supabase.from('credit_transactions').insert({
    user_id: authData.user!.id,
    transaction_type: 'signup_bonus',
    amount: 5,
    balance_after: 5,
    description: 'Welcome bonus - 5 free credits'
  })

  return NextResponse.json({ 
    message: 'Signup successful! 5 credits added.',
    user: authData.user 
  })
}
```

---

### Phase 4: Dashboard & UI (Day 5-6)

Follow the architecture document for:
- Navbar with dropdown (History & Logout)
- Language selector (10+ languages)
- Real-time OCR preview component
- Credit display component
- File uploader with validation

---

### Phase 5: API Integration (Day 7-8)

#### Setup Sarvam AI Client

Get API key from [sarvam.ai](https://sarvam.ai) and implement:
- Vision API for OCR
- TTS API for audio generation

#### Setup ElevenLabs (Fallback)

Get API key from [elevenlabs.io](https://elevenlabs.io) as backup TTS

---

### Phase 6: Testing & Deployment (Day 9-10)

1. Test all user flows
2. Add error handling
3. Deploy to Vercel
4. Setup environment variables in Vercel

---

## 🎯 Priority Checklist

- [ ] Project setup & dependencies
- [ ] Supabase database & storage
- [ ] Authentication with 5 credit bonus
- [ ] Middleware (auth, rate limit, credits)
- [ ] File upload with validation
- [ ] OCR with Sarvam Vision (10+ languages)
- [ ] Real-time OCR preview
- [ ] TTS with Sarvam/ElevenLabs
- [ ] Credit management system
- [ ] Navbar with dropdown menu
- [ ] Document history page
- [ ] Security implementation
- [ ] Testing
- [ ] Deployment

---

## 📦 Package.json Dependencies

```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/supabase-js": "^2.38.0",
    "@supabase/auth-helpers-nextjs": "^0.8.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "zustand": "^4.4.0",
    "lucide-react": "^0.292.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "isomorphic-dompurify": "^2.9.0",
    "validator": "^13.11.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

---

## 🚨 Common Issues & Solutions

### Issue: Rate limiting not working
**Solution:** Make sure the api_requests table is created with proper indexes. Run the cleanup function periodically to prevent table bloat:
```sql
SELECT cleanup_old_api_requests();
```

### Issue: Rate limiting is slow
**Solution:** The Supabase-based rate limiting adds ~50-100ms per request. This is acceptable for MVP. For production scale, consider:
- Adding indexes on (user_id, created_at)
- Running cleanup more frequently
- Upgrading to a dedicated rate limiting service if needed

### Issue: File upload fails
**Solution:** Check storage bucket policies and size limits

### Issue: Credits not deducting
**Solution:** Verify RLS policies on users table allow updates

---

## 📚 Next Steps After MVP

1. Add batch processing
2. Implement webhook notifications
3. Add analytics dashboard
4. Create mobile apps
5. Add payment integration for more credits

---

**Ready to build? Start with Phase 1 and follow the checklist!**
