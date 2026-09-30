'use client';
import { useSchool } from '@/components/SchoolProvider';
import { useDialogs } from '@/components/dialogs';
import { Bars, Options } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableRow, TableCell } from '@/components/ui/table';
import { SUBJECTS, avgScore, byId, clsName, latestExam, letter, pct, rateFor } from '@/lib/school';
import { cn } from '@/lib/utils';

export default function Reports(){
  const { S, ui, setUi } = useSchool();
  const d = useDialogs();
  const ex = byId(S.exams, ui.repExam) ? ui.repExam : (latestExam(S) || S.exams[0])?.id || '', pass = S.settings.passMark;
  const byClassAtt = S.classes.map(c => ({label:c.name.replace('Grade ',''), value:Math.round((rateFor(S,(dd,cc)=>cc===c.id)||0)*100)}));
  const subs = SUBJECTS.filter(s => avgScore(S,(e,sub)=>e===ex&&sub===s)!=null);
  const bySub = subs.map(s => ({label:s.slice(0,4), value:Math.round(avgScore(S,(e,sub)=>e===ex&&sub===s)), color:'var(--chart-2)'}));
  const dist = {A:0,B:0,C:0,D:0,F:0};
  Object.entries(S.grades).forEach(([k,v]) => { if (k.startsWith(ex+'|') && v!=='' && v!=null) dist[letter(Number(v))]++; });
  const distMax = Math.max(1,...Object.values(dist));
  const feeByClass = S.classes.map(c => { const fs = S.fees.filter(f => byId(S.students,f.studentId)?.classId===c.id); const b = fs.reduce((a,f)=>a+f.amount,0), p = fs.reduce((a,f)=>a+Math.min(f.paid,f.amount),0); return {label:c.name.replace('Grade ',''), value:b?Math.round(p/b*100):0, color:'var(--destructive)'}; });
  const actives = S.students.filter(s=>s.status==='Active');
  const ranked = actives.map(s => ({s, a:avgScore(S,(e,sub,sid)=>e===ex&&sid===s.id)})).filter(x=>x.a!=null).sort((a,b)=>b.a-a.a);
  const risk = actives.map(s => ({s, att:rateFor(S,(dd,c,sid)=>sid===s.id), a:avgScore(S,(e,sub,sid)=>e===ex&&sid===s.id)})).filter(x => (x.att!=null&&x.att<.85) || (x.a!=null&&x.a<pass));
  const bad = 'text-destructive font-semibold';
  return <>
    <div className="bar"><label className="field">Exam for academic reports<select value={ex} onChange={e => setUi({repExam:e.target.value})}><Options list={S.exams.map(e=>[e.id,e.name])}/></select></label></div>
    <div className="cols mt-0">
      <Card><CardHeader><CardTitle>Attendance by class</CardTitle></CardHeader><CardContent><Bars data={byClassAtt} fmt={v=>v+'%'}/></CardContent></Card>
      <Card><CardHeader><CardTitle>Average score by subject</CardTitle></CardHeader><CardContent>{bySub.length ? <Bars data={bySub}/> : <p className="muted">No scores for this exam yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Grade distribution</CardTitle></CardHeader><CardContent><Bars data={Object.entries(dist).map(([l,v])=>({label:l,value:v,color:l==='F'?'var(--destructive)':l==='D'?'var(--chart-4)':'var(--chart-1)'}))} max={distMax}/></CardContent></Card>
      <Card><CardHeader><CardTitle>Fee collection by class</CardTitle></CardHeader><CardContent><Bars data={feeByClass} fmt={v=>v+'%'}/></CardContent></Card>
    </div>
    <div className="cols">
      <Card>
        <CardHeader><CardTitle>Top 10 students</CardTitle></CardHeader>
        <CardContent>{ranked.length ? <div className="scroll"><table><thead><tr><th className="num">Rank</th><th>Student</th><th>Class</th><th className="num">Average</th></tr></thead><tbody>
          {ranked.slice(0,10).map((x,i) => <TableRow key={x.s.id}><TableCell className="text-right tabular-nums">{i+1}</TableCell><TableCell>{x.s.name}</TableCell><TableCell>{clsName(S,x.s.classId)}</TableCell><TableCell className="text-right tabular-nums">{x.a.toFixed(1)}</TableCell></TableRow>)}
        </tbody></table></div> : <p className="muted">No scores yet.</p>}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Students who may need support</CardTitle></CardHeader>
        <CardContent>
          <p className="small muted -mt-1">Attendance below 85% or an exam average below the pass mark.</p>
          {risk.length ? <div className="scroll"><table><thead><tr><th>Student</th><th>Class</th><th className="num">Attendance</th><th className="num">Average</th></tr></thead><tbody>
            {risk.map(x => <TableRow key={x.s.id}><TableCell className="whitespace-normal"><button className="link" onClick={() => d.stuProfile(x.s.id)}>{x.s.name}</button></TableCell><TableCell>{clsName(S,x.s.classId)}</TableCell>
              <TableCell className={cn('text-right tabular-nums', x.att!=null&&x.att<.85&&bad)}>{pct(x.att)}</TableCell>
              <TableCell className={cn('text-right tabular-nums', x.a!=null&&x.a<pass&&bad)}>{x.a==null?'—':x.a.toFixed(1)}</TableCell></TableRow>)}
          </tbody></table></div> : <p className="muted">No students flagged.</p>}
        </CardContent>
      </Card>
    </div>
  </>;
}
