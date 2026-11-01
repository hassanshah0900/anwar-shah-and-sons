import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';

/** UI and body text: navigation, forms, buttons, prices. */
export const fontSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

/** Display headings: hero, page titles, product names. Single weight by design. */
export const fontHeading = Instrument_Serif({
  variable: '--font-instrument-serif',
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

/** Code-like values such as SKUs and order numbers. */
export const fontMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const fontVariables = [fontSans.variable, fontHeading.variable, fontMono.variable].join(' ');
