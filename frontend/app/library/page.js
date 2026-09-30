'use client';
import { useSchool } from '@/components/SchoolProvider';
import { useDialogs } from '@/components/dialogs';
import { Badge, DataTable } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableRow, TableCell } from '@/components/ui/table';
import { addDays, byId, clsName, fmtDate, iso, stuName, today, uid } from '@/lib/school';

export default function Library(){
  const { S, update, toast } = useSchool();
  const d = useDialogs();
  const TODAY = today();
  const loans = []; S.books.forEach(b => b.loans.forEach(l => loans.push({b,l})));
  loans.sort((a,b) => a.l.due.localeCompare(b.l.due));

  const remove = id => { const b = byId(S.books,id); if (b.loans.length){ toast('Mark all copies returned before removing this book'); return; }
    d.confirm('Remove book?', `"${b.title}" will be removed from the catalogue.`, 'Remove book', 'Book removed', D => { D.books = D.books.filter(x=>x.id!==id); }); };
  const lend = id => { const b = byId(S.books,id);
    d.form(`Lend "${b.title}"`, [
      {k:'studentId',label:'Borrower',type:'select',opts:S.students.filter(s=>s.status==='Active').map(s=>[s.id,`${s.name} (${clsName(S,s.classId)})`]),wide:true},
      {k:'due',label:'Return by',type:'date',def:iso(addDays(new Date(),14)),req:true}
    ], null, (o, D) => { const db = byId(D.books,id); if (db.loans.length >= db.copies) return 'No copies left to lend'; db.loans.push({id:uid('l'), studentId:o.studentId, out:today(), due:o.due}); toast('Book lent'); }, 'Lend book'); };
  const giveBack = (bid, lid) => { update(D => { const b = byId(D.books,bid); b.loans = b.loans.filter(l=>l.id!==lid); }); toast('Book returned'); };

  return <>
    <div className="bar"><p className="grow muted m-0">{S.books.reduce((a,b)=>a+Number(b.copies),0)} copies across {S.books.length} titles, {loans.length} on loan</p><Button onClick={() => d.bookForm()}>Add book</Button></div>
    <DataTable heads={['Title','Author','Category','#Copies','#Available','']} empty="The catalogue is empty. Add your first book."
      rows={S.books.map(b => { const av = b.copies - b.loans.length; return <TableRow key={b.id}>
        <TableCell className="font-semibold text-foreground whitespace-normal">{b.title}</TableCell><TableCell>{b.author}</TableCell><TableCell>{b.category}</TableCell><TableCell className="text-right tabular-nums">{b.copies}</TableCell>
        <TableCell className="text-right tabular-nums">{av>0 ? av : <Badge variant="destructive">None left</Badge>}</TableCell>
        <TableCell>{av>0 && <Button variant="outline" size="sm" onClick={() => lend(b.id)}>Lend</Button>}<Button variant="ghost" size="sm" onClick={() => d.bookForm(b.id)}>Edit</Button><Button variant="destructive" size="sm" onClick={() => remove(b.id)}>Remove</Button></TableCell>
      </TableRow>; })}/>
    <Card className="mt-4">
      <CardHeader><CardTitle>Books on loan</CardTitle></CardHeader>
      <CardContent>
        {loans.length ? <div className="scroll"><table><thead><tr><th>Book</th><th>Borrower</th><th>Lent</th><th>Due back</th><th>Status</th><th></th></tr></thead><tbody>
          {loans.map(({b,l}) => <tr key={l.id}><td>{b.title}</td><td>{stuName(S,l.studentId)}</td><td>{fmtDate(l.out)}</td><td>{fmtDate(l.due)}</td><td><Badge t={l.due<TODAY?'Overdue':'On loan'}/></td>
            <td><Button variant="outline" size="sm" onClick={() => giveBack(b.id, l.id)}>Mark returned</Button></td></tr>)}
        </tbody></table></div> : <p className="muted">No books are on loan.</p>}
      </CardContent>
    </Card>
  </>;
}
