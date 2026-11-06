import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the design system (docs/adr/0004-monochrome-design-system.md).
 * Tailwind's theme already strips off-system colours and caps radius/shadow
 * scales; this catches the escape hatches the theme can't: arbitrary values,
 * gradients, blur, and default-palette classes that would silently render nothing.
 */

const srcDir = join(import.meta.dirname, '..');

const rules: { name: string; pattern: RegExp }[] = [
  {
    name: 'Tailwind default palette (use semantic tokens such as text-muted-foreground)',
    pattern:
      /\b[a-z]+-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
  },
  { name: 'arbitrary radius (use rounded-xs to rounded-lg)', pattern: /\brounded(?:-[a-z]+)?-\[/ },
  {
    name: 'radius above rounded-lg (the scale is capped; say what you mean)',
    pattern: /\brounded(?:-[a-z]+)?-(?:xl|2xl|3xl|4xl)\b/,
  },
  {
    name: 'arbitrary colour value (add a token in globals.css instead)',
    pattern: /\b[a-z-]+-\[(?:#|rgb|hsl|oklch|lab|lch)/,
  },
  { name: 'gradient', pattern: /\bbg-(?:gradient|linear|radial|conic)-/ },
  { name: 'backdrop blur', pattern: /\bbackdrop-blur\b|\bbackdrop-blur-/ },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('design system', () => {
  const files = sourceFiles(srcDir);

  it('scans the source tree', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(rules)('has no $name', ({ pattern }) => {
    const violations = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          pattern.test(line) ? [`${relative(srcDir, file)}:${index + 1}: ${line.trim()}`] : [],
        ),
    );

    expect(violations).toEqual([]);
  });
});
