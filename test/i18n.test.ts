import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const filesIn = (dir: string, ext: string) =>
  (readdirSync(join(root, dir), { recursive: true }) as string[])
    .filter((f) => f.endsWith(ext) && !f.includes('node_modules'))
    .map((f) => join(dir, f));
const keysOf = (bundle: string) =>
  new Set(
    read(`_i18n/${bundle}.properties`)
      .split(/\r?\n/)
      .filter((line) => line.trim() && !/^\s*[#!]/.test(line))
      .map((line) => line.split('=')[0].trim()),
  );
const matches = (files: string[], pattern: RegExp) =>
  files.flatMap((file) => [...read(file).matchAll(pattern)].map((m) => ({ file, m })));

const labels = keysOf('i18n');
const messages = keysOf('messages');
const cdsFiles = [...filesIn('app', '.cds'), ...filesIn('db', '.cds'), ...filesIn('srv', '.cds')];
const srvFiles = filesIn('srv', '.ts');
const isKey = (text: string) => /^[A-Z][A-Z0-9_]*$/.test(text);

describe('no hard-coded user-facing strings', () => {
  it('scans the expected sources', () => {
    expect(cdsFiles.length).toBeGreaterThanOrEqual(4);
    expect(srvFiles.length).toBeGreaterThanOrEqual(5);
  });

  it('takes every CDS label from an {i18n>…} key', () => {
    const literals = matches(
      cdsFiles,
      /(@title|@description|@Common\.Label|\bLabel|TypeName|TypeNamePlural)\s*:\s*'([^']*)'/g,
    )
      .filter(({ m }) => !/^\{i18n>[^}]+\}$/.test(m[2]))
      .map(({ file, m }) => `${file}: ${m[0]}`);
    expect(literals).toEqual([]);
  });

  it('resolves every {i18n>…} key in CDS; *.message keys in messages.properties', () => {
    const missing = matches(cdsFiles, /(\S+)\s*:\s*'\{i18n>([^}]+)\}'/g)
      .filter(({ m }) => !(m[1].endsWith('.message') ? messages : labels).has(m[2]))
      .map(({ file, m }) => `${file}: ${m[2]}`);
    expect(missing).toEqual([]);
  });

  it('uses message keys from messages.properties for every runtime message in srv/', () => {
    const texts = [
      ...matches(srvFiles, /\bmessage\s*:\s*([`'"])(.*?)\1/g),
      ...matches(
        srvFiles,
        /\breq\.(?:reject|error|warn|info|notify)\(\s*(?:\d{3}\s*,\s*)?([`'"])(.*?)\1/g,
      ),
    ].map(({ file, m }) => ({ file, text: m[2] }));
    expect(texts.length).toBeGreaterThanOrEqual(5);
    const bad = texts
      .filter(({ text }) => !isKey(text) || !messages.has(text))
      .map(({ file, text }) => `${file}: ${text}`);
    expect(bad).toEqual([]);
  });

  it('leaves no unused keys in either bundle', () => {
    const cds = cdsFiles.map(read).join('\n');
    const srv = srvFiles.map(read).join('\n');
    expect([...labels].filter((key) => !cds.includes(`{i18n>${key}}`))).toEqual([]);
    expect(
      [...messages].filter((key) => !srv.includes(`'${key}'`) && !cds.includes(`{i18n>${key}}`)),
    ).toEqual([]);
  });
});
