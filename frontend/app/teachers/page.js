'use client';
import { useSchool } from '@/components/SchoolProvider';
import { useDialogs } from '@/components/dialogs';
import { Badge, DataTable } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import { fmtDate, tName } from '@/lib/school';

export default function Teachers(){
  const { S } = useSchool();
  const d = useDialogs();
  const remove = id => d.confirm('Remove teacher?', `${tName(S,id)} will be removed. Classes they lead will show as unassigned.`, 'Remove teacher', 'Teacher removed', D => { D.teachers = D.teachers.filter(t=>t.id!==id); });
  return <>
    <div className="bar"><p className="grow muted m-0">{S.teachers.length} staff members</p><Button onClick={() => d.teaForm()}>Add teacher</Button></div>
    <DataTable heads={['Name','Subject','Homeroom','Phone','Email','Joined','Status','']} empty="No teachers yet. Add your first staff member."
      rows={S.teachers.map(t => { const home = S.classes.filter(c=>c.teacherId===t.id).map(c=>c.name).join(', '); return <TableRow key={t.id}>
        <TableCell className="font-semibold text-foreground">{t.name}</TableCell><TableCell>{t.subject}</TableCell>
        <TableCell>{home || <span className="muted">—</span>}</TableCell>
        <TableCell>{t.phone}</TableCell><TableCell>{t.email}</TableCell><TableCell>{fmtDate(t.joined)}</TableCell><TableCell><Badge t={t.status}/></TableCell>
        <TableCell><Button variant="ghost" size="sm" onClick={() => d.teaForm(t.id)}>Edit</Button><Button variant="destructive" size="sm" onClick={() => remove(t.id)}>Remove</Button></TableCell>
      </TableRow>; })}/>
  </>;
}
