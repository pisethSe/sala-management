'use client';
import { useState } from 'react';
import { useSchool } from './SchoolProvider';
import { Badge as BadgeUi } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ICONS, letter } from '@/lib/school';
import { cn } from '@/lib/utils';

// Status → Badge variant. Soft overlays follow the nova style; brand tokens
// carry the color.
const BADGE = {Paid:'success',Active:'success','On loan':'success',Partial:'warning',Unpaid:'warning',Overdue:'destructive',Inactive:'outline',Graduated:'outline',Transferred:'outline',Students:'secondary',Parents:'warning',Staff:'success',Everyone:'outline'};
export const Badge = ({ t }) => <BadgeUi variant={BADGE[t]||'outline'}>{t}</BadgeUi>;

export const LetterBadge = ({ x }) => x==null||x==='' ? <span className="muted">—</span>
  : <BadgeUi variant={x>=70?'success':x>=40?'warning':'destructive'}>{letter(x)}</BadgeUi>;

export const Icon = ({ id }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[id]}/></svg>
);

export const Options = ({ list }) => list.map(o => { const [v,l] = Array.isArray(o)?o:[o,o]; return <option key={v} value={v}>{l}</option>; });

// SVG bar chart. Colors come from the chart tokens unless a caller passes one.
export function Bars({ data, max=100, fmt=v=>v, color='var(--chart-1)' }){
  const step=64, bw=32, h=170, w=Math.max(data.length*step+20,300);
  return <div className="scroll"><svg viewBox={`0 0 ${w} ${h+40}`} width={w} height={h+40} role="img">
    {[0,.5,1].map(f => { const y = 12 + h - f*h; return <line key={f} className="stroke-border" x1="0" x2={w} y1={y} y2={y}/>; })}
    {data.map((d,i) => { const x=i*step+22, bh = d.value==null?0:Math.max(2,d.value/max*h);
      return <g key={i}>
        <rect x={x} y={12+h-bh} width={bw} height={bh} rx="4" fill={d.color||color}><title>{`${d.label}: ${d.value==null?'no data':fmt(d.value)}`}</title></rect>
        <text x={x+bw/2} y={8+h-bh} textAnchor="middle" className="fill-muted-foreground text-[11px]">{d.value==null?'':fmt(d.value)}</text>
        <text x={x+bw/2} y={h+32} textAnchor="middle" className="fill-foreground text-[11.5px]">{d.label}</text>
      </g>; })}
  </svg></div>;
}

export const DataTable = ({ heads, rows, empty='Nothing here yet.' }) => (
  <div className="tablewrap"><Table>
    <TableHeader><TableRow>
      {heads.map((h,i) => <TableHead key={i} className={cn(h.startsWith('#') ? 'text-right' : 'text-muted-foreground text-[13px]')}>{h.replace(/^#/,'')}</TableHead>)}
    </TableRow></TableHeader>
    <TableBody>{rows.length ? rows : <TableRow><TableCell colSpan={heads.length} className="empty whitespace-normal">{empty}</TableCell></TableRow>}</TableBody>
  </Table></div>
);

// Modal body for a data-entry form. onSave(values, draft) mutates the draft;
// returning a string rejects the save and shows it as a toast.
// Alternatively, action(values) is an async save (e.g. an API call) that
// resolves to an error string or nothing.
export function FormBody({ fields, values, onSave, action, submit='Save' }){
  const { update, toast, closeModal } = useSchool();
  const [busy, setBusy] = useState(false);
  const vals = values || {};
  const onSubmit = async e => {
    e.preventDefault();
    if (busy) return;
    const o = Object.fromEntries(new FormData(e.target));
    fields.forEach(f => { if (f.type==='number') o[f.k] = Number(o[f.k]); });
    let err;
    if (action){ setBusy(true); err = await action(o); setBusy(false); }
    else err = update(D => onSave(o, D));
    if (err){ toast(err); return; }
    closeModal();
  };
  return <form onSubmit={onSubmit}>
    <FieldGroup className="grid grid-cols-2 gap-x-3.5 gap-y-3 max-[900px]:grid-cols-1">
      {fields.map(f => {
        const v = vals[f.k] ?? f.def ?? '';
        const common = { id:f.k, name:f.k, required:!!f.req, defaultValue:v, ...(f.attr||{}) };
        const inp = f.type==='select' ? <select {...common}><Options list={f.opts}/></select>
          : f.type==='textarea' ? <Textarea rows={4} {...common}/>
          : <Input type={f.type||'text'} {...common}/>;
        return <Field key={f.k} className={f.wide?'col-span-full':''}>
          <FieldLabel htmlFor={f.k}>{f.label}</FieldLabel>
          {inp}
        </Field>;
      })}
      <div className="col-span-full flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : submit}</Button>
      </div>
    </FieldGroup>
  </form>;
}

// Confirmation dialog. fn(draft) mutates the data; or action() is an async
// operation that resolves to an error string or nothing.
export function ConfirmBody({ text, label, doneMsg, fn, action }){
  const { update, toast, closeModal } = useSchool();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (action){
      setBusy(true); const err = await action(); setBusy(false);
      if (err){ toast(err); return; }
    } else update(fn);
    closeModal(); toast(doneMsg);
  };
  return <>
    <p className="m-0 text-sm">{text}</p>
    <div className="flex justify-end gap-2 mt-3">
      <Button variant="ghost" onClick={closeModal}>Cancel</Button>
      <Button variant="destructive" disabled={busy} onClick={go}>{busy ? 'Working…' : label}</Button>
    </div>
  </>;
}
