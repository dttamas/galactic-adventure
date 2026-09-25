import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const webapp = join(__dirname, '../app/spacefarers/webapp');
const bootstraps = (readdirSync(webapp, { recursive: true }) as string[])
  .filter((f) => f.endsWith('.html'))
  .map((f) => ({ file: f.replaceAll('\\', '/'), html: readFileSync(join(webapp, f), 'utf8') }))
  .map(({ file, html }) => ({ file, tag: /<script[^>]*sap-ui-core\.js[^>]*>/s.exec(html)?.[0] }))
  .filter((b): b is { file: string; tag: string } => Boolean(b.tag));

describe('UI5 bootstrap', () => {
  it('finds the app, FLP sandbox and OPA pages', () => {
    expect(bootstraps.map((b) => b.file).sort()).toEqual([
      'index.html',
      'test/flpSandbox.html',
      'test/integration/opaTests.qunit.html',
    ]);
  });

  // otherwise UI5 follows the browser language, e.g. Hungarian buttons and dates
  it.each(bootstraps)('starts $file in English', ({ tag }) => {
    expect(tag).toMatch(/\sdata-sap-ui-language="en"/);
  });
});
