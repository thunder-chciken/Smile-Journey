/* =========================================================
   Sample data. Every date is relative to "today" so the demo
   always reads correctly whenever the client opens it.
   ========================================================= */

const DAY = 864e5;
const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
function addDays(n) { const d = new Date(TODAY); d.setDate(d.getDate() + n); return d; }
// Same as addDays but never lands on a weekend (office is closed)
function workday(n) {
  const d = addDays(n); const w = d.getDay();
  if (w === 6) d.setDate(d.getDate() + 2);
  if (w === 0) d.setDate(d.getDate() + 1);
  return d;
}
const daysBetween = (a, b) => Math.round((b - a) / DAY);

const PLACED = addDays(-52);
const ABUTMENT = workday(32);
const CROWN = workday(46);

const SHADES = [
  { code: 'BL1', hex: '#f6f3ec', note: 'Brightest bleach white' },
  { code: 'BL2', hex: '#f2ede1', note: 'Bright, natural white' },
  { code: 'BL3', hex: '#eee7d6', note: 'Soft bright white' },
  { code: 'A1',  hex: '#ece2ca', note: 'Light natural' },
  { code: 'B1',  hex: '#eee5cd', note: 'Light, slightly cool' },
  { code: 'A2',  hex: '#e5d7b8', note: 'Natural' },
  { code: 'B2',  hex: '#e6d9b9', note: 'Natural, cool' },
  { code: 'A3',  hex: '#dccaa3', note: 'Natural, warmer' },
];

const STATE = {
  signedIn: false,
  patient: { first: 'Sarah', last: 'Mitchell', initials: 'SM', since: TODAY.getFullYear(), email: 'sarah.mitchell@example.com' },
  phase: 3,
  phases: [
    {
      title: 'Consultation & 3D scan', short: 'Consult & scan', date: addDays(-115),
      desc: 'Exam, 3D CBCT scan and your custom treatment plan.',
      what: 'Dr. Duraini examined the area, took a 3D CBCT scan of your jaw and walked you through your treatment plan, timeline and cost.',
      length: '60–90 min', prep: ['Bring your insurance card and a list of medications', 'Write down any questions you have'],
      after: ['Review your treatment plan in Documents', 'Book your extraction visit'],
    },
    {
      title: 'Extraction & bone graft', short: 'Extraction', date: addDays(-101),
      desc: 'The damaged tooth was removed and the site rebuilt with a bone graft.',
      what: 'The failing tooth was gently removed and a bone graft was placed so there is a strong foundation for your implant.',
      length: '60 min', prep: ['Eat a light meal 2 hours before', 'Arrange a ride if you choose sedation'],
      after: ['Soft foods for a few days', 'No straws or smoking for 72 hours', 'Use ice 20 min on / 20 min off'],
    },
    {
      title: 'Implant placement', short: 'Implant placed', date: PLACED,
      desc: 'Your titanium implant was placed into the healed bone.',
      what: 'A small titanium post was placed in your jawbone. This becomes the new root for your tooth.',
      length: '60–90 min', prep: ['Nothing to eat 6 hours before sedation', 'Arrange a driver for the day', 'Take your antibiotic 1 hour before'],
      after: ['Take medications as prescribed', 'Chew on the opposite side', 'Gentle salt-water rinses after meals'],
    },
    {
      title: 'Healing', short: 'Healing', date: PLACED, end: ABUTMENT,
      desc: 'Your implant is fusing with the bone. This is what makes it strong for life.',
      what: 'This is called osseointegration. Your bone grows around the implant and locks it in place. It takes about 12 weeks and you won’t feel a thing.',
      length: 'About 12 weeks', prep: ['Keep chewing on the other side', 'Keep the area clean: brush gently, rinse after meals'],
      after: ['A quick healing check halfway through', 'Then your abutment visit'],
    },
    {
      title: 'Abutment & digital impression', short: 'Abutment', date: ABUTMENT,
      desc: 'A connector is attached and we scan for your custom crown.',
      what: 'A small connector called an abutment is attached to your implant. Then we take a quick digital scan (no goopy trays) so the lab can craft your crown.',
      length: '60 min', prep: ['Eat a normal meal beforehand', 'Local anesthetic only, so you can drive yourself'],
      after: ['Mild tenderness for a day or two', 'Your crown is made in about 2 weeks'],
    },
    {
      title: 'Final crown', short: 'Final crown', date: CROWN,
      desc: 'Your custom crown is placed. Your new smile is complete!',
      what: 'Your custom zirconia crown, matched to the shade you picked, is fitted and secured. We check your bite and take your after photo.',
      length: '45 min', prep: ['Plan for your after photo!', 'No special prep needed'],
      after: ['Eat normally right away', 'Care for it like a natural tooth'],
    },
    {
      title: '6-month check-up', short: 'Maintenance', date: workday(46 + 182),
      desc: 'A check of your implant, gums and bite.',
      what: 'We check the implant, the gums around it and your bite, and take an X-ray to confirm everything is healthy.',
      length: '45 min', prep: ['Regular brushing and flossing'], after: ['Then cleanings every 6 months'],
    },
  ],

  appts: [
    { id: 'a1', title: 'Healing check', date: workday(11), time: '10:30 AM', dur: '20 min', kind: 'Quick visit',
      prep: ['No special prep needed', 'Bring any questions about your healing'] },
    { id: 'a2', title: 'Abutment & digital impression', date: ABUTMENT, time: '9:00 AM', dur: '60 min', kind: 'Procedure',
      prep: ['Eat a normal meal beforehand', 'Local anesthetic only, so you can drive yourself', 'Brush & floss before you come in'] },
    { id: 'a3', title: 'Final crown placement', date: CROWN, time: '11:00 AM', dur: '45 min', kind: 'Procedure',
      prep: ['Plan for your after photo!', 'No special prep needed'] },
    { id: 'p1', past: true, title: 'Post-op check', date: addDays(-45), time: '2:15 PM', dur: '20 min', notes: 'Healing well. Sutures removed.' },
    { id: 'p2', past: true, title: 'Implant placement', date: PLACED, time: '8:00 AM', dur: '90 min', notes: 'Implant #19 placed. IV sedation.' },
    { id: 'p3', past: true, title: 'Extraction & bone graft', date: addDays(-101), time: '9:30 AM', dur: '60 min', notes: 'Tooth #19 extracted, socket graft placed.' },
    { id: 'p4', past: true, title: 'Consultation & 3D scan', date: addDays(-115), time: '1:00 PM', dur: '75 min', notes: 'CBCT scan. Treatment plan accepted.' },
  ],

  specs: [
    { id: 's1', name: 'Implant crown', where: 'Lower left molar · #19', teeth: [19], material: 'Zirconia', shade: 'BL2',
      shape: 'Natural, matched to neighbors', lab: 'Precision Smile Lab', labCase: 'PSL-20418', status: 'In design', approved: addDays(-30) },
    { id: 's2', name: 'Porcelain veneers', where: 'Upper 8 · #5–#12', teeth: [5, 6, 7, 8, 9, 10, 11, 12], material: 'e.max porcelain', shade: 'BL2',
      shape: 'Soft square', lab: 'Precision Smile Lab', labCase: 'PSL-20419', status: 'Planned', approved: addDays(-30) },
  ],

  meds: [
    { id: 'm1', name: 'Salt-water rinse', dose: '½ tsp salt in warm water · swish 30 sec', times: ['After breakfast', 'After dinner'], taken: [false, false], icon: 'droplets', color: '#30b0c7' },
    { id: 'm2', name: 'Vitamin D3', dose: '2,000 IU · supports bone healing', times: ['With breakfast'], taken: [true], icon: 'sun', color: '#ff9500' },
  ],
  pastMeds: [
    { name: 'Amoxicillin 500 mg', note: '3× daily for 7 days', end: addDays(-45) },
    { name: 'Ibuprofen 600 mg', note: 'As needed for discomfort', end: addDays(-42) },
    { name: 'Chlorhexidine 0.12% rinse', note: 'Twice daily for 2 weeks', end: addDays(-38) },
  ],
  allergies: ['Codeine (nausea)'],
  medReminders: true,

  threads: [
    {
      id: 'care', name: 'Care Team', sub: 'Dr. Duraini’s office', unread: 1,
      msgs: [
        { from: 'me', text: 'Hi! Is it okay to start chewing on the left side yet? It feels totally fine.', at: addDays(-3), time: '7:42 PM', topic: 'Question' },
        { from: 'them', who: 'Care Team', text: 'Hi Sarah! So glad it feels good. Please keep chewing on the right side until your abutment visit. The implant is still bonding with the bone. Soft foods on the left are okay.', at: addDays(-2), time: '9:15 AM' },
        { from: 'me', text: 'Got it, thank you!', at: addDays(-2), time: '9:20 AM' },
        { from: 'them', who: 'Care Team', text: 'Quick reminder: your healing check is coming up. See you soon!', at: addDays(-1), time: '4:05 PM' },
      ],
    },
    {
      id: 'billing', name: 'Billing', sub: 'Payments & insurance', unread: 0,
      msgs: [
        { from: 'them', who: 'Billing', text: 'We received your payment of $310.00. Thank you, Sarah!', at: addDays(-21), time: '11:02 AM' },
      ],
    },
  ],

  billing: {
    balance: 1240, monthly: 310, left: 4, next: addDays(9),
    history: [
      { label: 'Payment · Visa •• 4821', amt: -310, at: addDays(-21) },
      { label: 'Payment · Visa •• 4821', amt: -310, at: addDays(-51) },
      { label: 'Insurance paid · Delta Dental', amt: -1500, at: addDays(-60) },
      { label: 'Implant placement #19', amt: 3360, at: PLACED },
    ],
  },

  family: [
    { name: 'Robert Mitchell', rel: 'Dad', initials: 'RM', note: 'Full upper denture · next visit ' + workday(17).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
  ],

  notify: { appts: true, meds: true, messages: true, tips: false },
  faceId: true,
  textLarge: false,

  rescheduled: {},
  pendingPush: [],
};
