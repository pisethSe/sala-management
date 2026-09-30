'use client';
import { useSchool } from '@/components/SchoolProvider';
import { useDialogs } from '@/components/dialogs';
import { LetterBadge } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { emptyData } from '@/lib/school';
import { api } from '@/lib/api';

export default function Settings(){
  const { S, update, toast } = useSchool();
  const d = useDialogs();
  const onSubmit = e => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    update(D => { Object.assign(D.settings, {school:o.school.trim(), year:o.year.trim(), term:o.term, passMark:Math.max(0,Math.min(100,Number(o.passMark)||40))}); });
    toast('Settings saved');
  };
  const reset = () => d.confirmAsync('Clear all data?', 'Every student, teacher, class, grade, invoice and other record will be permanently deleted. School settings are kept.', 'Clear data', 'All data cleared',
    async () => {
      try { await api('DELETE', '/api/students'); } catch(e){ return e.message; }
      update(D => { const settings = D.settings; Object.assign(D, emptyData(), { settings }); });
    });
  return <div className="cols mt-0">
    <Card>
      <CardHeader><CardTitle>School profile</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} key={JSON.stringify(S.settings)}>
          <FieldGroup className="grid grid-cols-2 gap-x-3.5 gap-y-3 max-[900px]:grid-cols-1">
            <Field className="col-span-full">
              <FieldLabel htmlFor="school">School name</FieldLabel>
              <Input id="school" name="school" defaultValue={S.settings.school} required/>
            </Field>
            <Field>
              <FieldLabel htmlFor="year">Academic year</FieldLabel>
              <Input id="year" name="year" defaultValue={S.settings.year} required/>
            </Field>
            <Field>
              <FieldLabel htmlFor="term">Current term</FieldLabel>
              <select id="term" name="term" defaultValue={S.settings.term}><option>Term 1</option><option>Term 2</option></select>
            </Field>
            <Field>
              <FieldLabel htmlFor="passMark">Pass mark</FieldLabel>
              <Input id="passMark" name="passMark" type="number" min="0" max="100" defaultValue={S.settings.passMark}/>
            </Field>
            <div className="col-span-full flex justify-end gap-2">
              <Button type="submit">Save settings</Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Grading scale</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Grade</TableHead><TableHead>Score</TableHead><TableHead>Meaning</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell><LetterBadge x={90}/></TableCell><TableCell>85–100</TableCell><TableCell>Excellent</TableCell></TableRow>
            <TableRow><TableCell><LetterBadge x={75}/></TableCell><TableCell>70–84</TableCell><TableCell>Very good</TableCell></TableRow>
            <TableRow><TableCell><LetterBadge x={60}/></TableCell><TableCell>55–69</TableCell><TableCell>Good</TableCell></TableRow>
            <TableRow><TableCell><LetterBadge x={45}/></TableCell><TableCell>40–54</TableCell><TableCell>Fair</TableCell></TableRow>
            <TableRow><TableCell><LetterBadge x={10}/></TableCell><TableCell>0–39</TableCell><TableCell>Needs improvement</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Roles and access</CardTitle></CardHeader>
      <CardContent>
        <p className="small mt-0">Switch roles at the bottom of the sidebar to preview what each person sees.</p>
        <ul className="todo small">
          <li><span className="dot"></span><div><b>Admin</b> can use every module, including settings and staff records.</div></li>
          <li><span className="dot g"></span><div><b>Teacher</b> sees students, classes, attendance, grades, timetable, library, notices and calendar.</div></li>
          <li><span className="dot r"></span><div><b>Accountant</b> sees students, fees and payments, reports, notices and calendar.</div></li>
        </ul>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Data</CardTitle></CardHeader>
      <CardContent>
        <p className="small mt-0">Records are saved in the Supabase PostgreSQL database through the API. Clearing deletes every record but keeps the school settings.</p>
        <Button variant="destructive" onClick={reset}>Clear all data</Button>
      </CardContent>
    </Card>
  </div>;
}
