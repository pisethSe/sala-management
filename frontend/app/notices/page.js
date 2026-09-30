'use client';
import { useSchool } from '@/components/SchoolProvider';
import { useDialogs } from '@/components/dialogs';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { byId, fmtDate, today, uid } from '@/lib/school';

export default function Notices(){
  const { S, role, update, toast } = useSchool();
  const d = useDialogs();
  const list = [...S.notices].sort((a,b) => (b.pinned-a.pinned) || b.date.localeCompare(a.date));
  const canEdit = role !== 'Accountant';
  const post = () => d.form('Post notice', [
    {k:'title',label:'Title',req:true,wide:true},
    {k:'audience',label:'Audience',type:'select',opts:['Everyone','Students','Parents','Staff']},
    {k:'pinned',label:'Pin to top',type:'select',opts:[['','No'],['1','Yes']]},
    {k:'body',label:'Message',type:'textarea',req:true,wide:true}
  ], null, (o, D) => { D.notices.push({id:uid('n'), date:today(), ...o, pinned:!!o.pinned}); toast('Notice posted'); }, 'Post notice');
  const pin = id => { const pinned = !byId(S.notices,id).pinned; update(D => { byId(D.notices,id).pinned = pinned; }); toast(pinned?'Pinned':'Unpinned'); };
  const remove = id => d.confirm('Delete notice?', 'This notice will be removed for everyone.', 'Delete notice', 'Notice deleted', D => { D.notices = D.notices.filter(n=>n.id!==id); });
  return <>
    <div className="bar"><p className="grow muted m-0">Pinned notices appear first on everyone's dashboard.</p>{canEdit && <Button onClick={post}>Post notice</Button>}</div>
    <div className="flex flex-col gap-3">
      {list.length ? list.map(n => <Card key={n.id} className={n.pinned?'border-l-4 border-l-gold':''}>
        <CardHeader>
          <div className="row"><Badge t={n.audience}/><span className="small muted">{fmtDate(n.date)}{n.pinned?', pinned':''}</span></div>
          <CardTitle>{n.title}</CardTitle>
        </CardHeader>
        <CardContent><p className="m-0 max-w-[75ch] whitespace-pre-line">{n.body}</p></CardContent>
        {canEdit && <CardFooter className="gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => pin(n.id)}>{n.pinned?'Unpin':'Pin to top'}</Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(n.id)}>Delete</Button>
        </CardFooter>}
      </Card>) : <Card><CardContent className="empty">No notices yet. Post one to reach students, parents or staff.</CardContent></Card>}
    </div>
  </>;
}
