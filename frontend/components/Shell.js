'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSchool } from './SchoolProvider';
import { useAuth } from './AuthProvider';
import { Icon, Badge } from './ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PAGES, ROLES, feeStatus, href, overdueLoans, pageFromPath, unmarkedToday } from '@/lib/school';
import { cn } from '@/lib/utils';

// Modal. The school context's openModal(title, content) API is unchanged;
// the shadcn Dialog handles Escape, the backdrop, and focus.
function Modal(){
  const { modal, closeModal } = useSchool();
  return <Dialog open={!!modal} onOpenChange={open => { if (!open) closeModal(); }}>
    <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[640px] max-h-[90vh] overflow-y-auto gap-4">
      {modal && <DialogHeader><DialogTitle>{modal.title}</DialogTitle></DialogHeader>}
      {modal?.content}
    </DialogContent>
  </Dialog>;
}

export default function Shell({ children }){
  const { S, ui, role, setRole, toast, toastMsg, closeModal, loadError } = useSchool();
  const { session, user, role: authRole, signOut } = useAuth();
  const path = usePathname(), router = useRouter();
  const [sideOpen, setSideOpen] = useState(false);
  const cur = pageFromPath(path);
  const allowed = ROLES[role].includes(cur) && PAGES.some(p => p[0]===cur);
  const label = PAGES.find(x => x[0]===cur)?.[1] || 'Dashboard';

  // The signed-in user's role (from the JWT's app_metadata) drives access.
  useEffect(() => { if (session) setRole(authRole); }, [session, authRole, setRole]);
  useEffect(() => { setSideOpen(false); closeModal(); }, [path, closeModal]);
  useEffect(() => { if (S && !allowed) router.replace('/'); }, [S, allowed, router]);
  useEffect(() => { if (S) document.title = label + ' – ' + S.settings.school; }, [S, label]);

  if (loadError) return <div className="app"><div className="mx-auto mt-10 w-full max-w-[520px]">
    <div className="panel">
      <h3>Cannot reach the database</h3>
      <p className="small muted">{loadError}</p>
      <p className="small muted">Check that the API is running and that DATABASE_URL in .env.local is correct, then reload.</p>
    </div>
  </div></div>;
  if (!S || !ui) return <div className="app" />;

  const counts = {attendance: unmarkedToday(S).length, fees: S.fees.filter(f => feeStatus(f)==='Overdue').length, library: overdueLoans(S).length};
  let grp = null;
  const nav = [];
  PAGES.filter(p => ROLES[role].includes(p[0])).forEach(([id,text,g]) => {
    if (g !== grp){ grp = g; if (g) nav.push(<div key={'g'+g} className="ngroup">{g}</div>); }
    nav.push(<Link key={id} href={href(id)} className={id===cur?'on':''} aria-current={id===cur?'page':undefined}>
      <Icon id={id}/>{text}{counts[id] ? <span className="count" title="Needs attention">{counts[id]}</span> : null}
    </Link>);
  });

  return <>
    <div className="app">
      <aside className={`side ${sideOpen?'open':''}`} aria-label="Main navigation">
        <div className="brand">
          <div className="mark" aria-hidden="true">ស</div>
          <div><div className="bname">{S.settings.school}</div><div className="bsub">Academic year {S.settings.year}</div></div>
        </div>
        <nav>{nav}</nav>
        <div className="side-foot">
          <div className="text-sidebar-foreground/60">Signed in as</div>
          <div className="small text-white truncate" title={user?.email}>{user?.email}</div>
          <div className="row mt-1.5">
            <Badge t={role}/>
            <button className="icon-btn" onClick={() => signOut()}>Sign out</button>
          </div>
        </div>
      </aside>
      {sideOpen && <div className="scrim" onClick={() => setSideOpen(false)}></div>}
      <div className="main">
        <header className="top">
          <button className="burger" onClick={() => setSideOpen(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <h1>{label}</h1>
          <span className="date">{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
        </header>
        <main className="view">{allowed ? children : null}</main>
      </div>
    </div>
    <Modal/>
    <div className={cn('toast', toastMsg.show && 'show')} role="status" aria-live="polite">{toastMsg.text}</div>
  </>;
}
