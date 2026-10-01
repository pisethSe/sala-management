'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// Sign in / sign up against Supabase Auth. Roles come from the signed-in
// user's app_metadata after the session is established.
export default function LoginScreen(){
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

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
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@school.edu.kh"/>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" required autoComplete={mode==='signin'?'current-password':'new-password'} placeholder="••••••••"/>
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? (mode==='signin'?'Signing in…':'Creating account…') : (mode==='signin'?'Sign in':'Create account')}
            </Button>
          </div>
        </form>
        <Separator className="my-4"/>
        <button className="small muted w-full text-center cursor-pointer bg-none border-0 hover:underline"
          onClick={() => { setMode(m => m==='signin'?'signup':'signin'); setError(''); }}>
          {mode==='signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </CardContent>
    </Card>
  </div>;
}
