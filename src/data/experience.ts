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
  { start: 'Spring 2027', role: 'Member of Technical Staff Intern', org: 'Abridge',
    what: 'Incoming, in San Francisco.', model: 'abridge' },
  { start: 'Spring 2025', end: 'now', role: 'AV Research Lead', org: 'Mobility Systems Control Lab', short: 'MSC Lab · UGA',
    what: 'Research on LLM agents that stress-test self-driving models in simulation, while plain code checks every action. First-author paper under review.', href: '/stress-testing/', model: 'lab' },
  { start: 'Summer 2026', role: 'Software Engineering Intern', org: 'Roblox',
    what: 'Built an LLM agent that writes owner-reviewed behavior catalogs for services. It ran on 60+ services, and owners merged its catalogs into 40+ repos.', model: 'roblox' },
  { start: 'Summer 2025', end: 'Winter 2026', role: 'Software Engineering Intern', org: 'Leidos',
    what: "Ported the CARMA–CARLA bridge to ROS 2 so USDOT's open-source cooperative-driving stack co-simulates directly with CARLA.", href: '/cdasim/', model: 'leidos' },
  { start: 'Fall 2023', end: 'now', role: 'B.S. Computer Science', org: 'University of Georgia', short: 'UGA',
    what: 'Presidential Scholar and Zell Miller Scholar.', model: 'uga' },
  { start: '2023', end: '2025', role: 'Co-founder', org: 'Paragon Policy Fellowship',
    what: 'A nonprofit pairing students with state and local governments on tech policy. Built the platform, helped raise $100k+.', minor: true },
  { start: '2022', role: 'Congressional App Challenge winner', org: 'GA-05',
    what: 'For <a href="/techdetect/">TechDetect</a>, built during the STEM@GTRI internship.', href: 'https://www.congressionalappchallenge.us/22-ga05/', minor: true },
];
