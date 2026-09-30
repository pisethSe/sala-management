'use client';
import { useSchool } from '@/components/SchoolProvider';
import { useDialogs } from '@/components/dialogs';
import { Badge, DataTable, Options } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableRow, TableCell } from '@/components/ui/table';
import { STATUSES, classOpts, clsName, pct, rateFor, stuName } from '@/lib/school';

export default function Students(){
  const { S, ui, setUi, role } = useSchool();
  const d = useDialogs();
  const q = ui.q.trim().toLowerCase();
  const canEdit = role !== 'Accountant';
  const list = S.students.filter(x => (!ui.cls || x.classId===ui.cls) && (!ui.st || x.status===ui.st) &&
    (!q || (x.name+' '+x.code+' '+x.guardian+' '+x.phone).toLowerCase().includes(q)));
  const remove = id => d.confirmAsync('Remove student?', `${stuName(S,id)} and their attendance, grades and invoices will be deleted. To keep their records, set the status to Transferred instead.`, 'Remove student', 'Student removed',
    () => d.removeStudent(id));
  const rows = list.map(x => <TableRow key={x.id}>
    <TableCell className="text-muted-foreground">{x.code}</TableCell>
    <TableCell><button className="link" onClick={() => d.stuProfile(x.id)}>{x.name}</button></TableCell>
    <TableCell>{x.gender}</TableCell><TableCell>{clsName(S,x.classId)}</TableCell>
    <TableCell>{x.guardian}</TableCell><TableCell>{x.phone}</TableCell>
    <TableCell className="text-right tabular-nums">{pct(rateFor(S,(dd,c,s)=>s===x.id))}</TableCell>
    <TableCell><Badge t={x.status}/></TableCell>
    <TableCell>{canEdit && <><Button variant="ghost" size="sm" onClick={() => d.stuForm(x.id)}>Edit</Button><Button variant="destructive" size="sm" onClick={() => remove(x.id)}>Remove</Button></>}</TableCell>
  </TableRow>);
  return <>
    <div className="bar">
      <label className="field grow">Search<Input type="search" value={ui.q} onChange={e => setUi({q:e.target.value})} placeholder="Name, student ID, guardian or phone"/></label>
      <label className="field">Class<select value={ui.cls} onChange={e => setUi({cls:e.target.value})}><option value="">All classes</option><Options list={classOpts(S)}/></select></label>
      <label className="field">Status<select value={ui.st} onChange={e => setUi({st:e.target.value})}><option value="">Any status</option><Options list={STATUSES}/></select></label>
      {canEdit && <Button onClick={() => d.stuForm()}>Enrol student</Button>}
    </div>
    <p className="small muted -mt-1 mb-2.5">Showing {list.length} of {S.students.length} students</p>
    <DataTable heads={['Student ID','Name','Gender','Class','Guardian','Phone','#Attendance','Status','']} rows={rows} empty="No students match these filters. Try clearing the search."/>
  </>;
}
