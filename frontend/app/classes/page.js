'use client';
import { useRouter } from 'next/navigation';
import { useSchool } from '@/components/SchoolProvider';
import { useDialogs } from '@/components/dialogs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { avgScore, byId, classStudents, clsName, latestExam, pct, rateFor, tName } from '@/lib/school';

export default function Classes(){
  const { S, role, setUi, toast } = useSchool();
  const d = useDialogs();
  const router = useRouter();
  const isAdmin = role === 'Admin';
  const exam = latestExam(S);
  const remove = id => {
    if (S.students.some(s=>s.classId===id)) { toast('Move or remove its students before removing this class'); return; }
    d.confirm('Remove class?', `${clsName(S,id)} will be removed along with its timetable.`, 'Remove class', 'Class removed', D => { D.classes = D.classes.filter(c=>c.id!==id); delete D.timetable[id]; });
  };
  return <>
    <div className="bar"><p className="grow muted m-0">{S.classes.length} classes, {S.students.filter(s=>s.status==='Active').length} active students</p>{isAdmin && <Button onClick={() => d.clsForm()}>Add class</Button>}</div>
    <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">{S.classes.length ? S.classes.map(c => { const n = classStudents(S,c.id).length, avg = exam && avgScore(S,(e,sub,sid)=>e===exam.id && byId(S.students,sid)?.classId===c.id); return <Card key={c.id}>
      <CardHeader>
        <CardTitle>{c.name}</CardTitle>
        <CardDescription>{c.room}, homeroom teacher {tName(S,c.teacherId)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="small">{n} of {c.capacity} seats filled</div>
        <Progress value={Math.min(100,n/c.capacity*100)} className="mt-2 w-full"/>
        <div className="small mt-2">Attendance {pct(rateFor(S,(dd,cc)=>cc===c.id))}, {exam ? exam.name.toLowerCase() : 'exam'} average {avg==null?'—':avg.toFixed(1)}</div>
      </CardContent>
      <CardFooter className="gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => { setUi({cls:c.id, st:'Active', q:''}); router.push('/students'); }}>View students</Button>
        {isAdmin && <><Button variant="ghost" size="sm" onClick={() => d.clsForm(c.id)}>Edit</Button><Button variant="destructive" size="sm" onClick={() => remove(c.id)}>Remove</Button></>}
      </CardFooter>
    </Card>; }) : <div className="panel empty">No classes yet.</div>}</div>
  </>;
}
