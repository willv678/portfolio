// The timeline on the home page, newest first. One plain sentence each; the
// PDF has the detail. `model` picks the little 3D object shown beside the
// active entry (see src/scenes/experience.ts). `minor` entries are smaller.
export interface Entry {
  start: string; end?: string;
  short?: string;                 // shorter org name for the caption under the 3D viewer    // "Jan 2027", "now", or omit end for a single date
  role: string; org: string;
  what: string;
  href?: string;
  model?: 'abridge' | 'roblox' | 'leidos' | 'lab' | 'uga';
  minor?: boolean;
}

// Order: most recent activity first (ongoing roles count as "now").
export const experience: Entry[] = [
  { start: 'Jan 2027', role: 'Member of Technical Staff Intern', org: 'Abridge',
    what: 'Incoming. Starting in San Francisco in January.', model: 'abridge' },
  { start: 'Jan 2025', end: 'now', role: 'AV Research Lead', org: 'Mobility Systems Control Lab', short: 'MSC Lab · UGA',
    what: 'First author on SimGate (submitted to IEEE IV 2027): an LLM agent that runs self-driving stress tests while plain code checks every action.', href: '/simgate/', model: 'lab' },
  { start: 'Jun 2026', end: 'Aug 2026', role: 'Software Engineering Intern', org: 'Roblox',
    what: 'Built an LLM agent that writes owner-reviewed behavior catalogs for services. It ran on 60+ services, and owners merged its catalogs into 40+ repos.', model: 'roblox' },
  { start: 'May 2025', end: 'Jan 2026', role: 'Software Engineering Intern', org: 'Leidos',
    what: "Ported the CARMA–CARLA bridge to ROS 2 so USDOT's open-source cooperative-driving stack co-simulates directly with CARLA.", href: '/cdasim/', model: 'leidos' },
  { start: 'Aug 2023', end: 'May 2027', role: 'B.S. Computer Science', org: 'University of Georgia', short: 'UGA',
    what: 'Presidential Scholar and Zell Miller Scholar. Expected to graduate May 2027.', model: 'uga' },
  { start: 'Dec 2023', end: 'Mar 2025', role: 'Co-founder', org: 'Paragon Policy Fellowship',
    what: 'A nonprofit pairing students with state and local governments on tech policy. Built the platform, helped raise $100k+.', minor: true },
  { start: '2022', role: 'Congressional App Challenge winner', org: 'GA-05',
    what: 'For TechDetect, built during the STEM@GTRI internship.', href: '/techdetect/', minor: true },
];
