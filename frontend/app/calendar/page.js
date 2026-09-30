'use client';
import { useSchool } from '@/components/SchoolProvider';
import { useDialogs } from '@/components/dialogs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { byId, fmtDate, today, uid } from '@/lib/school';

export default function Calendar(){
  const { S, ui, setUi, role, toast } = useSchool();
  const d = useDialogs();
  const TODAY = today();
  const [y,m] = ui.cal.split('-').map(Number);
  const first = new Date(y,m-1,1), off = (first.getDay()+6)%7, dim = new Date(y,m,0).getDate();
  const cells = [];
  for (let i=0;i<off;i++) cells.push(<div key={'a'+i} className="d x"></div>);
  for (let n=1; n<=dim; n++){
    const ds = `${y}-${String(m).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
    cells.push(<div key={ds} className={`d ${ds===TODAY?'today':''}`}><span className="n">{n}</span>
      {S.events.filter(e => e.date===ds).map(e => <span key={e.id} className={`ev ${e.type}`} title={e.title}>{e.title}</span>)}</div>);
  }
  while (cells.length % 7) cells.push(<div key={'z'+cells.length} className="d x"></div>);
  const month = S.events.filter(e => e.date.startsWith(ui.cal)).sort((a,b)=>a.date.localeCompare(b.date));
  const canEdit = role !== 'Accountant';
  const move = n => { const nd = new Date(y, m-1+n, 1); setUi({cal:`${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}`}); };
  const add = () => d.form('Add event', [
    {k:'title',label:'Title',req:true,wide:true},{k:'date',label:'Date',type:'date',def:TODAY,req:true},
    {k:'type',label:'Type',type:'select',opts:['Event','Exam','Holiday','Meeting']}
  ], null, (o, D) => { D.events.push({id:uid('v'),...o}); setUi({cal:o.date.slice(0,7)}); toast('Event added'); }, 'Add event');
  const remove = id => d.confirm('Delete event?', `"${byId(S.events,id).title}" will be removed from the calendar.`, 'Delete event', 'Event deleted', D => { D.events = D.events.filter(e=>e.id!==id); });
  return <>
    <div className="bar items-center">
      <Button variant="outline" onClick={() => move(-1)} aria-label="Previous month">‹</Button>
      <h2 className="text-[22px] min-w-[190px] text-center">{first.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</h2>
      <Button variant="outline" onClick={() => move(1)} aria-label="Next month">›</Button>
      <Button variant="ghost" onClick={() => setUi({cal:TODAY.slice(0,7)})}>Today</Button>
      <div className="grow"></div>
      {canEdit && <Button onClick={add}>Add event</Button>}
    </div>
    <div className="scroll"><div className="cal">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(n => <div key={n} className="h">{n}</div>)}{cells}</div></div>
    <Card className="mt-4">
      <CardHeader><CardTitle>This month</CardTitle></CardHeader>
      <CardContent>
        {month.length ? <ul className="todo">{month.map(e => <li key={e.id}><span className={`dot ${e.type==='Exam'?'r':e.type==='Holiday'?'g':''}`}></span>
          <div className="flex-1"><b>{e.title}</b><br/><span className="small muted">{fmtDate(e.date)}, {e.type.toLowerCase()}</span></div>
          {canEdit && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(e.id)}>Delete</Button>}</li>)}</ul>
        : <p className="muted">Nothing scheduled this month.</p>}
      </CardContent>
    </Card>
  </>;
}
