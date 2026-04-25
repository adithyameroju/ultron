import type { PosterContent } from './posterTypes';

/**
 * B2B-only copy for ACKO for Business (commercial, group, and enterprise lines).
 * Avoids D2C / retail “buy for yourself” angles.
 */
export const ENTERPRISE_DEMO_PRESETS: PosterContent[] = [
  {
    overline: 'ACKO for Business',
    headline: 'Group health that finance and HR can defend in the room',
    subhead:
      'Designated partner workflows, clear schedules for teams, and reporting that helps you answer renewal and utilisation questions without another spreadsheet fire drill.',
    cta: 'Book a B2B benefits review',
    footnote: 'Issued by ACKO. T&Cs apply.',
    hashtags: 'ACKO for Business, GroupHealth, B2B, HR',
  },
  {
    overline: 'ACKO for Business',
    headline: 'Commercial motor and fleets: one view from bind to claim',
    subhead:
      'Built for transport and operations leads who need renewals, endorsements, and loss ratios in one place—so procurement sees the same numbers risk does.',
    cta: 'Talk to commercial motor',
    footnote: 'Issued by ACKO. T&Cs apply.',
    hashtags: 'ACKO for Business, Fleet, Commercial, B2B',
  },
  {
    overline: 'ACKO for Business',
    headline: 'Professional and liability cover that matches how you contract',
    subhead:
      'Schedules, limits, and addenda that keep pace with SOWs and parent-company requirements—so legal and risk aren’t waiting on a PDF from last year.',
    cta: 'See commercial lines for firms',
    footnote: 'Issued by ACKO. T&Cs apply.',
    hashtags: 'ACKO for Business, Commercial, Enterprise, B2B',
  },
  {
    overline: 'ACKO for Business',
    headline: 'Help people leaders explain cover without a policy decoder',
    subhead:
      'Cohort-based collateral and plain-language summaries for company town halls and open enrolment—so your managers answer the same questions once, not twenty times in Slack.',
    cta: 'Get an employer comms pack',
    footnote: 'Issued by ACKO. T&Cs apply.',
    hashtags: 'ACKO for Business, Employer, HR, B2B',
  },
  {
    overline: 'ACKO for Business',
    headline: 'Renewals your CFO can forecast without a surprise line item',
    subhead:
      'Transparent basis of cover, defensible data for RFPs, and a single thread with your broker and risk team—built for companies that buy cover the way they buy software.',
    cta: 'Request a renewal walkthrough',
    footnote: 'Issued by ACKO. T&Cs apply.',
    hashtags: 'ACKO for Business, Risk, Finance, B2B',
  },
];

export function pickRandomDemoPreset(): PosterContent {
  const i = Math.floor(Math.random() * ENTERPRISE_DEMO_PRESETS.length);
  return { ...ENTERPRISE_DEMO_PRESETS[i]! };
}
