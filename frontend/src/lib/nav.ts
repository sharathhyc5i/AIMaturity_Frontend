import {
  Board20Regular, BookQuestionMark20Regular, BuildingRetail20Regular, CalendarClock20Regular,
  DataTrending20Regular, DocumentSearch20Regular,
  LayerDiagonal20Regular, ListBar20Regular, Map20Regular, People20Regular,
  TaskListLtr20Regular, TextBulletListSquareWarning20Regular, EyeOff20Regular, Trophy20Regular,
  DocumentBulletList20Regular, DataHistogram20Regular, LinkMultiple20Regular, ShieldPerson20Regular, PersonAccounts20Regular, ShieldTask20Regular, Settings20Regular,
} from '@fluentui/react-icons'
import type { FluentIcon } from '@fluentui/react-icons'

/** A locked item shows a not-allowed cursor and does not open its page. Remove `locked` to enable it. */
export interface NavItem { path: string; label: string; icon: FluentIcon; blurb: string; locked?: boolean }
export interface NavSection {
  id: string; label: string; icon: FluentIcon; items: NavItem[]; adminOnly?: boolean
  /** Show as one sidebar link (to the first item); the pages are reached by tabs instead. */
  single?: boolean
}

/** Guide pages. They are reached from the Guide link in Overview and by the tabs on the Guide page, not as separate sidebar links. */
export const GUIDE_ITEMS: NavItem[] = [
  { path: '/guide/question-set', label: 'Question set', icon: ListBar20Regular, blurb: 'The 158 questions and how an agent answers each.' },
  { path: '/guide/accounts', label: 'Account list', icon: BuildingRetail20Regular, blurb: 'Accounts, markets, routes and peer retailers.' },
  { path: '/guide/dm8-target', label: 'DM8 target', icon: Map20Regular, blurb: 'The eight target markets and their account entries.' },
  { path: '/guide/dimensions', label: 'Dimensions and definitions', icon: LayerDiagonal20Regular, blurb: 'What each dimension measures, level by level.' },
  { path: '/guide/levels', label: 'Five levels and scoring decision', icon: People20Regular, blurb: 'Crawl, walk, run — and the rule that decides a score.' },
  { path: '/guide/scoring-framework', label: 'Levels scoring framework', icon: TextBulletListSquareWarning20Regular, blurb: 'Tests, thresholds and a live scoring simulator.' },
  // Hidden for now: uncomment to show Evidence quality again
  // { path: '/guide/evidence-quality', label: 'Evidence quality and missing information', icon: ShieldCheckmark20Regular, blurb: 'What every evidence record must carry.' },
  { path: '/guide/freshness', label: 'Freshness policy', icon: CalendarClock20Regular, blurb: 'How old evidence can be before it is refreshed.' },
]

export const NAV: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Board20Regular,
    items: [
      { path: '/overview/account-assessment', label: 'Account assessment', icon: DataTrending20Regular, blurb: 'Where the account scores on each dimension, and how sure we are.' },
      { path: '/overview/competitor-comparison', label: 'Comparison', icon: Trophy20Regular, blurb: 'Microsoft against competing vendors, and the retailer against its peers.' },
      // Hidden for now: uncomment to show Questions outcome by dimension again
      // { path: '/overview/questions-by-dimension', label: 'Questions outcome by dimension', icon: ChartMultiple20Regular, blurb: 'Every question, its result and the evidence behind it.' },
      // The Guide pages are reached by the tabs on the Guide page itself
      { path: '/guide/question-set', label: 'Guide', icon: BookQuestionMark20Regular, blurb: 'The question set, account list, dimensions, levels, scoring and freshness.' },
    ],
  },
]

export const ADMIN_NAV: NavSection = {
  id: 'admin',
  label: 'Admin',
  icon: ShieldPerson20Regular,
  adminOnly: true,
  items: [
    { path: '/admin/users', label: 'Users', icon: PersonAccounts20Regular, blurb: 'Who can sign in, and who is an admin.' },
    { path: '/admin/evidence-register', label: 'Evidence register', icon: DocumentBulletList20Regular, blurb: 'Every evidence record behind the scores, its state and its review.' },
    { path: '/admin/score-register', label: 'Score register', icon: DataHistogram20Regular, blurb: 'Saved score versions and month-on-month progress.' },
    { path: '/admin/source-register', label: 'Source register', icon: LinkMultiple20Regular, blurb: 'Every link consulted for the run, and what it was used for.' },
    // Hidden for now: uncomment to show Journey assessment again
    // { path: '/admin/journey-assessment', label: 'Journey assessment', icon: PersonArrowRight20Regular, blurb: 'What a shopper or partner meets at each stage of the journey.' },
    { path: '/admin/evidence-gaps', label: 'Evidence gaps', icon: DocumentSearch20Regular, blurb: 'Where the evidence is missing, thin, old or in conflict.' },
    { path: '/admin/next-actions', label: 'Next actions', icon: TaskListLtr20Regular, blurb: 'Who does what next, by when.' },
    { path: '/admin/not-published', label: 'What the retailer didn’t publish', icon: EyeOff20Regular, blurb: 'Questions with no public answer either way.' },
    // Hidden for now: uncomment to show Access requests and Caveats again
    // { path: '/admin/access-requests', label: 'Access requests', icon: LockClosed20Regular, blurb: 'Sites that blocked our crawler, and the allowlisting request to each retailer.' },
    // { path: '/admin/caveats', label: 'Caveats', icon: Info20Regular, blurb: 'Internal limits to keep in mind before sharing results.' },
    { path: '/admin/evidence-approval', label: 'Evidence approval', icon: ShieldTask20Regular, blurb: 'Product evidence that needs a person to approve it before it counts.' },
    { path: '/admin/settings', label: 'Settings', icon: Settings20Regular, blurb: 'Retailers, countries, dimensions, levels, scoring, freshness and evidence states.' },
  ],
}
/** Hidden for now: set to true to show the Admin section in the sidebar again. Its pages and routes are unchanged. */
export const SHOW_ADMIN = false
if (SHOW_ADMIN) NAV.push(ADMIN_NAV)
// While the full Admin section is hidden, admins still get Users (who has access, and their role)
else NAV.push({ ...ADMIN_NAV, items: ADMIN_NAV.items.filter((i) => i.path === '/admin/users') })

// Guide items come first so their own titles win over the Overview "Guide" link, which has the same path.
// Admin items are always listed here so their pages keep their titles while the section is hidden.
export const ALL_ITEMS = [
  ...GUIDE_ITEMS.map((i) => ({ ...i, section: 'Guide' })),
  ...[...NAV, ...(SHOW_ADMIN ? [] : [ADMIN_NAV])].flatMap((s) =>
    s.items.map((i) => ({ ...i, section: s.label })),
  ),
]