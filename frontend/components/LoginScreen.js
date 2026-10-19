'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// Demo accounts for anyone testing the system. Shown on the login form with
// one-click fill. Remove this block and rotate the passwords before real use.
const DEMO_PASSWORD = 'Demo@12345';
const DEMO_ACCOUNTS = [
  ['admin@sala-school.com', 'Admin'],
  ['teacher@sala-school.com', 'Teacher'],
  ['accountant@sala-school.com', 'Accountant'],
];

// Sign in / sign up against Supabase Auth. Roles come from the signed-in
// user's app_metadata after the session is established.
export default function LoginScreen(){
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const emailRef = useRef(null), passRef = useRef(null);

  const fillDemo = email => {
    if (emailRef.current) emailRef.current.value = email;
    if (passRef.current) passRef.current.value = DEMO_PASSWORD;
  };

  const onSubmit = async e => {
    e.preventDefault();
    if (busy) return;
    const o = Object.fromEntries(new FormData(e.target));
    setBusy(true); setError('');
    const supabase = createClient();
    const { error: authError } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: o.email.trim(), password: o.password })
      : await supabase.auth.signUp({ email: o.email.trim(), password: o.password });
    setBusy(false);
    if (authError){ setError(authError.message); return; }
    if (mode === 'signup') setSent(true); // email confirmation → confirm, then sign in
  };

  if (sent) return <div className="min-h-screen grid place-items-center bg-background p-4">
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gold text-sidebar grid place-items-center text-xl font-semibold">ស</div>
          <CardTitle>Check your email</CardTitle>
        </div>
        <CardDescription>We sent a confirmation link to your email address. Confirm the account, then sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full" onClick={() => { setSent(false); setMode('signin'); }}>Back to sign in</Button>
      </CardContent>
    </Card>
  </div>;

  return <div className="min-h-screen grid place-items-center bg-background p-4">
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gold text-sidebar grid place-items-center text-xl font-semibold">ស</div>
          <div>
            <CardTitle>Sala Secondary School</CardTitle>
            <CardDescription>School management system. Sign in to continue.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@school.edu.kh" ref={emailRef}/>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" required autoComplete={mode==='signin'?'current-password':'new-password'} placeholder="••••••••" ref={passRef}/>
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? (mode==='signin'?'Signing in…':'Creating account…') : (mode==='signin'?'Sign in':'Create account')}
            </Button>
          </div>
        </form>
        <Separator className="my-4"/>
        <div className="rounded-lg border border-border bg-secondary p-3">
          <div className="text-[13px] font-medium mb-1.5">Demo accounts <span className="muted font-normal">— for testing, pick one</span></div>
          <div className="flex flex-col gap-1.5">
            {DEMO_ACCOUNTS.map(([email, role]) => (
              <div key={email} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="truncate"><Badge t={role}/> <span className="ml-1">{email}</span> <span className="muted">· {DEMO_PASSWORD}</span></span>
                <Button type="button" variant="ghost" size="sm" onClick={() => fillDemo(email)}>Use</Button>
              </div>
            ))}
          </div>
        </div>
        <button className="small muted w-full text-center cursor-pointer bg-none border-0 hover:underline mt-3"
          onClick={() => { setMode(m => m==='signin'?'signup':'signin'); setError(''); }}>
          {mode==='signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </CardContent>
    </Card>
  </div>;
}
