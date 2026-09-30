'use client';
import { useState } from 'react';
import { useSchool } from '@/components/SchoolProvider';
import { useDialogs } from '@/components/dialogs';
import { DataTable, LetterBadge, Options } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TableRow, TableCell } from '@/components/ui/table';
import { SUBJECTS, avgScore, byId, classOpts, classStudents, fmtDate, latestExam } from '@/lib/school';
import { cn } from '@/lib/utils';

// Keeps the typed text locally so partial input isn't clamped mid-keystroke;
// on blur it snaps back to the stored score.
function ScoreInput({ gkey, stored, pass, label }){
  const { update } = useSchool();
  const [text, setText] = useState(null);
  const shown = text ?? (stored ?? '');
  return <Input type="number" min="0" max="100" step="1" aria-label={label} className={cn('w-[84px] text-right', stored!=null&&stored<pass&&'border-destructive')}
    value={shown}
    onChange={e => {
      const t = e.target.value; setText(t);
      if (t === '') { update(D => { delete D.grades[gkey]; }); return; }
      const v = Math.round(Number(t)); if (isNaN(v)) return;
      update(D => { D.grades[gkey] = Math.max(0, Math.min(100, v)); });
    }}
    onBlur={() => setText(null)}/>;
}

export default function Gradebook(){
  const { S, ui, setUi } = useSchool();
  const d = useDialogs();
  const cls = byId(S.classes, ui.gClass) ? ui.gClass : S.classes[0]?.id || '';
  const exam = byId(S.exams, ui.gExam) ? ui.gExam : (latestExam(S) || S.exams[0])?.id || '';
  const pass = S.settings.passMark;
  const bar = <div className="bar">
    <label className="field">Exam<select value={exam} onChange={e => setUi({gExam:e.target.value})}><Options list={S.exams.map(e=>[e.id,`${e.name} (${fmtDate(e.date)})`])}/></select></label>
    <label className="field">Class<select value={cls} onChange={e => setUi({gClass:e.target.value})}><Options list={classOpts(S)}/></select></label>
    <label className="field">Subject<select value={ui.gSub} onChange={e => setUi({gSub:e.target.value})}><Options list={SUBJECTS}/></select></label>
    <div className="grow"></div>
    <Button variant="outline" onClick={() => d.examForm()}>Schedule exam</Button>
  </div>;
  if (!exam) return <>{bar}<Card><CardContent className="empty">No exams yet. Schedule one to start entering scores.</CardContent></Card></>;
  const list = classStudents(S,cls);
  const sc = list.map(x => S.grades[`${exam}|${ui.gSub}|${x.id}`]).filter(v => v!==''&&v!=null).map(Number);
  const passed = sc.filter(v => v>=pass).length;
  const rows = list.map(x => { const k = `${exam}|${ui.gSub}|${x.id}`, v = S.grades[k]; const ea = avgScore(S,(e,sub,sid)=>e===exam&&sid===x.id); return <TableRow key={x.id}>
    <TableCell><div className="font-semibold">{x.name}</div><div className="small muted">{x.code}</div></TableCell>
    <TableCell><ScoreInput key={k} gkey={k} stored={v} pass={pass} label={`Score for ${x.name}`}/></TableCell>
    <TableCell><LetterBadge x={v ?? null}/></TableCell>
    <TableCell className="text-right tabular-nums">{ea==null?'—':ea.toFixed(1)}</TableCell>
    <TableCell><Button variant="ghost" size="sm" onClick={() => d.reportCard(x.id, exam)}>Report card</Button></TableCell>
  </TableRow>; });
  return <>
    {bar}
    <Card className="mb-4">
      <CardContent className="tally">
        {sc.length ? <>
          <span><b>{(sc.reduce((a,b)=>a+b,0)/sc.length).toFixed(1)}</b>average</span><span><b>{Math.max(...sc)}</b>highest</span><span><b>{Math.min(...sc)}</b>lowest</span>
          <span><b>{Math.round(passed/sc.length*100)}%</b>passed</span><span><b>{sc.length}/{list.length}</b>entered</span>
        </> : <span className="muted">No scores entered for this subject yet.</span>}
      </CardContent>
    </Card>
    <DataTable heads={['Student','Score (0–100)','Grade','#Exam average','']} rows={rows} empty="No active students in this class."/>
    <p className="small muted">Grades: A 85+, B 70–84, C 55–69, D 40–54, F below 40. Pass mark is {pass}. Scores save as you type.</p>
  </>;
}
