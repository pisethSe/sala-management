import { describe, it, expect } from 'vitest';
import {
  feeStatus, letter, pct, money, fmtDate, iso, addDays, today, latestExam, uid,
  byId, clsName, stuName, tName, classStudents, classOpts, emptyData,
  attDates, rateFor, avgScore, overdueLoans, unmarkedToday, href, pageFromPath, PAGES, ROLES,
} from './school';

describe('feeStatus (business rule: Paid → Overdue → Partial → Unpaid)', () => {
  const fee = (amount, paid, due) => ({ amount, paid, due });

  it('marks a fully paid invoice as Paid', () => {
    expect(feeStatus(fee(180, 180, '2099-01-01'))).toBe('Paid');
    expect(feeStatus(fee(180, 250, '2099-01-01'))).toBe('Paid'); // overpaid counts as Paid
  });

  it('marks a past-due unpaid invoice as Overdue', () => {
    expect(feeStatus(fee(180, 0, '2000-01-01'))).toBe('Overdue');
  });

  it('marks a part-paid invoice as Partial', () => {
    expect(feeStatus(fee(180, 50, '2099-01-01'))).toBe('Partial');
  });

  it('marks a past-due part-paid invoice as Overdue (Overdue is checked before Partial)', () => {
    expect(feeStatus(fee(180, 50, '2000-01-01'))).toBe('Overdue');
  });

  it('marks an unpaid future invoice as Unpaid', () => {
    expect(feeStatus(fee(180, 0, '2099-01-01'))).toBe('Unpaid');
  });
});

describe('letter (grade scale: A 85+, B 70–84, C 55–69, D 40–54, F below 40)', () => {
  it('maps scores to letters at every boundary', () => {
    expect(letter(100)).toBe('A');
    expect(letter(85)).toBe('A');
    expect(letter(84)).toBe('B');
    expect(letter(70)).toBe('B');
    expect(letter(69)).toBe('C');
    expect(letter(55)).toBe('C');
    expect(letter(54)).toBe('D');
    expect(letter(40)).toBe('D');
    expect(letter(39)).toBe('F');
    expect(letter(0)).toBe('F');
  });
});

describe('formatting helpers', () => {
  it('pct shows — for null and rounds otherwise', () => {
    expect(pct(null)).toBe('—');
    expect(pct(0.5)).toBe('50%');
    expect(pct(0.854)).toBe('85%');
  });

  it('money formats dollars with thousands separators', () => {
    expect(money(0)).toBe('$0');
    expect(money(1234.5)).toBe('$1,234.5');
    expect(money(null)).toBe('$0');
  });

  it('fmtDate formats en-GB and shows — for empty', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate('2026-10-02')).toMatch(/2 Oct 2026/);
  });

  it('iso produces YYYY-MM-DD in local time', () => {
    expect(iso('2026-10-02T00:00')).toBe('2026-10-02');
  });

  it('addDays moves a date by n days', () => {
    expect(iso(addDays('2026-10-02', 14))).toBe('2026-10-16');
    expect(iso(addDays('2026-10-02', -30))).toBe('2026-09-02');
  });

  it('today is the local ISO date', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uid keeps its prefix and is unique', () => {
    const a = uid('s'), b = uid('s');
    expect(a.startsWith('s')).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe('latestExam (past exams only, newest first)', () => {
  it('picks the latest past exam and ignores future ones', () => {
    const T = today();
    const past = (offset) => iso(addDays(new Date(), offset));
    const S = { exams: [
      { id: 'e1', name: 'Old midterm', date: past(-30) },
      { id: 'e2', name: 'Recent quiz', date: past(-2) },
      { id: 'e3', name: 'Final', date: past(30) },
    ] };
    expect(latestExam(S)?.id).toBe('e2');
  });

  it('returns null when there are no past exams', () => {
    const future = iso(addDays(new Date(), 10));
    expect(latestExam({ exams: [{ id: 'e1', date: future }] })).toBeNull();
    expect(latestExam({ exams: [] })).toBeNull();
  });
});

describe('selectors', () => {
  const S = {
    students: [
      { id: 's1', name: 'AStudent', classId: 'c1', status: 'Active', gender: 'Female' },
      { id: 's2', name: 'BStudent', classId: 'c1', status: 'Inactive', gender: 'Male' },
      { id: 's3', name: 'CStudent', classId: 'c2', status: 'Active', gender: 'Male' },
    ],
    teachers: [{ id: 't1', name: 'Ms Chan', status: 'Active' }],
    classes: [{ id: 'c1', name: 'Grade 10A', capacity: 40 }, { id: 'c2', name: 'Grade 10B', capacity: 40 }],
    fees: [], payments: [], books: [], attendance: {}, grades: {}, exams: [],
  };

  it('byId finds by id', () => {
    expect(byId(S.students, 's2')?.name).toBe('BStudent');
    expect(byId(S.students, 'zz')).toBeUndefined();
  });

  it('clsName / stuName / tName fall back gracefully', () => {
    expect(clsName(S, 'c1')).toBe('Grade 10A');
    expect(clsName(S, 'zz')).toBe('No class');
    expect(stuName(S, 's1')).toBe('AStudent');
    expect(stuName(S, 'zz')).toBe('Removed student');
    expect(tName(S, 't1')).toBe('Ms Chan');
    expect(tName(S, 'zz')).toBe('Unassigned');
  });

  it('classStudents only returns active students of the class', () => {
    expect(classStudents(S, 'c1').map(x => x.id)).toEqual(['s1']); // s2 is Inactive
    expect(classStudents(S, 'zz')).toEqual([]);
  });

  it('classOpts returns id/name pairs', () => {
    expect(classOpts(S)).toEqual([['c1', 'Grade 10A'], ['c2', 'Grade 10B']]);
  });
});

describe('attendance logic', () => {
  const S = {
    classes: [{ id: 'c1', name: 'Grade 10A' }, { id: 'c2', name: 'Grade 10B' }],
    attendance: {
      '2026-10-01|c1': { s1: 'P', s2: 'A', s3: 'L' },
      '2026-10-02|c1': { s1: 'P', s2: 'L' },
      '2026-10-02|c2': { s1: 'P' },
    },
    students: [], teachers: [], exams: [], fees: [], payments: [], books: [], notices: [], events: [], grades: {}, timetable: {},
  };

  it('attDates lists unique sorted dates', () => {
    expect(attDates(S)).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('rateFor counts present+late as attended, absent as not', () => {
    // 2026-10-01|c1: P, A, L → 2 of 3 attended
    expect(rateFor(S, (d, c) => d === '2026-10-01' && c === 'c1')).toBeCloseTo(2 / 3);
    // s1 across all days: P, P → 100%
    expect(rateFor(S, (d, c, sid) => sid === 's1')).toBe(1);
    // everything: 6 records (3 + 2 + 1), 5 attended (one absent)
    expect(rateFor(S, () => true)).toBeCloseTo(5 / 6);
  });

  it('rateFor returns null with no matching records', () => {
    expect(rateFor(S, () => false)).toBeNull();
  });
});

describe('avgScore', () => {
  const S = { grades: { 'e1|Khmer|s1': 80, 'e1|Math|s1': 90, 'e1|ICT|s2': '', 'e1|English|s3': null } };

  it('averages only entered scores', () => {
    expect(avgScore(S, (e, sub, sid) => e === 'e1' && sid === 's1')).toBe(85);
  });

  it('returns null when nothing matches or nothing is entered', () => {
    expect(avgScore(S, () => false)).toBeNull();
    expect(avgScore(S, (e, sub, sid) => sid === 's2')).toBeNull();
  });
});

describe('library logic', () => {
  it('overdueLoans finds loans past their due date', () => {
    const T = today();
    const S = { books: [
      { title: 'A', loans: [{ id: 'l1', due: iso(addDays(new Date(), -5)) }, { id: 'l2', due: iso(addDays(new Date(), 5)) }] },
      { title: 'B', loans: [] },
    ] };
    expect(overdueLoans(S)).toHaveLength(1);
    expect(overdueLoans(S)[0].l.id).toBe('l1');
  });
});

describe('unmarkedToday', () => {
  const S = {
    classes: [{ id: 'c1', name: 'A' }, { id: 'c2', name: 'B' }],
    attendance: {},
    students: [], teachers: [], exams: [], fees: [], payments: [], books: [], notices: [], events: [], grades: {}, timetable: {},
  };

  it('returns an array of classes without attendance for today', () => {
    const wd = new Date().getDay();
    if (wd === 0 || wd === 6) {
      expect(unmarkedToday(S)).toEqual([]); // weekends never need attendance
    } else {
      const T = today();
      S.attendance[T + '|c1'] = { s1: 'P' };
      expect(unmarkedToday(S).map(c => c.id)).toEqual(['c2']);
    }
  });
});

describe('emptyData (the full document shape the app expects)', () => {
  it('has every module key the UI reads', () => {
    const d = emptyData();
    expect(d.settings).toEqual({ school: 'Sala Secondary School', year: '2026–2027', term: 'Term 1', passMark: 40 });
    for (const key of ['teachers', 'classes', 'students', 'attendance', 'exams', 'grades', 'fees', 'payments', 'books', 'notices', 'events', 'timetable']) {
      expect(d[key]).toBeDefined();
    }
  });
});

describe('navigation and roles', () => {
  it('href maps dashboard to / and others to /id', () => {
    expect(href('dashboard')).toBe('/');
    expect(href('students')).toBe('/students');
  });

  it('pageFromPath extracts the page id', () => {
    expect(pageFromPath('/')).toBe('dashboard');
    expect(pageFromPath('/students')).toBe('students');
    expect(pageFromPath('/')).toBe('dashboard');
  });

  it('Admin sees every page; Teacher and Accountant see subsets', () => {
    expect(ROLES.Admin).toEqual(PAGES.map(p => p[0]));
    expect(ROLES.Teacher).not.toContain('settings');
    expect(ROLES.Teacher).not.toContain('fees');
    expect(ROLES.Accountant).not.toContain('gradebook');
    expect(ROLES.Accountant).toContain('fees');
    for (const page of ROLES.Teacher) expect(PAGES.some(p => p[0] === page)).toBe(true);
    for (const page of ROLES.Accountant) expect(PAGES.some(p => p[0] === page)).toBe(true);
  });
});
