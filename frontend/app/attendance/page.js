'use client';
import { useSchool } from '@/components/SchoolProvider';
import { DataTable, Options } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableRow, TableCell } from '@/components/ui/table';
import { byId, classOpts, classStudents, pct, rateFor, today } from '@/lib/school';

const NAMES = {P:'Present',L:'Late',A:'Absent'};

export default function Attendance(){
  const { S, ui, setUi, update, toast } = useSchool();
  const cls = byId(S.classes, ui.attClass) ? ui.attClass : S.classes[0]?.id || '';
  const key = ui.attDate+'|'+cls, rec = S.attendance[key] || {};
  const list = classStudents(S,cls);
  const wd = new Date(ui.attDate+'T00:00').getDay();
  const c = {P:0,L:0,A:0}; list.forEach(x => { if (rec[x.id]) c[rec[x.id]]++; });
  const un = list.length - c.P - c.L - c.A;
  const mark = (ids, v) => update(D => { const r = D.attendance[key] || (D.attendance[key] = {}); ids.forEach(id => { r[id] = v; }); });
  const rows = list.map(x => <TableRow key={x.id}>
    <TableCell><div className="font-semibold">{x.name}</div><div className="small muted">{x.code}</div></TableCell>
    <TableCell><div className="seg" role="group" aria-label={`Attendance for ${x.name}`}>{['P','L','A'].map(v =>
      <button key={v} className={v} aria-pressed={rec[x.id]===v} onClick={() => mark([x.id], v)}>{NAMES[v]}</button>)}</div></TableCell>
    <TableCell className="text-right tabular-nums">{pct(rateFor(S,(d,cc,s)=>s===x.id))}</TableCell>
    <TableCell className="whitespace-normal">{x.guardian}<div className="small muted">{x.phone}</div></TableCell>
  </TableRow>);
  return <>
    <div className="bar">
      <label className="field">Class<select value={cls} onChange={e => setUi({attClass:e.target.value})}><Options list={classOpts(S)}/></select></label>
      <label className="field">Date<input type="date" value={ui.attDate} max={today()} onChange={e => { if (e.target.value) setUi({attDate:e.target.value}); }}/></label>
      <div className="grow"></div>
      <Button variant="gold" onClick={() => { mark(list.map(x => x.id), 'P'); toast('Everyone marked present'); }}>Mark everyone present</Button>
    </div>
    {(wd===0||wd===6) && <Alert variant="warning" className="mb-4 border-warning/30">
      <AlertTitle>This date is a weekend.</AlertTitle>
      <AlertDescription>Choose a school day unless you are recording a special session.</AlertDescription>
    </Alert>}
    <Card className="mb-4">
      <CardContent className="tally">
        <span><b className="text-success">{c.P}</b>present</span><span><b className="text-warning">{c.L}</b>late</span>
        <span><b className="text-destructive">{c.A}</b>absent</span><span><b>{un}</b>not marked</span>
        <span className="small muted ml-auto">Changes save as you click. Guardian contacts are listed for follow-up.</span>
      </CardContent>
    </Card>
    <DataTable heads={['Student','Status','#Term attendance','Guardian']} rows={rows} empty="No active students in this class."/>
  </>;
}
