import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseArgs, designDir } from './install-pi-design.mjs';
import { join } from 'node:path';
const { root } = parseArgs(process.argv.slice(2));
const chunks = `${root}/dist/bundle/chunks`;
const marker = 'UserMessageComponent=class extends Container';
const matches = readdirSync(chunks).filter(name => name.endsWith('.js')).map(name => ({
  name, source: readFileSync(`${chunks}/${name}`, 'utf8'),
})).filter(({ source }) => source.includes(marker));
assert(matches.length > 0, 'Locate the actual bundled renderer');
const tui = await import(`${root}/node_modules/@earendil-works/pi-tui/dist/index.js`);
const themes = await import(`${root}/dist/modes/interactive/theme/theme.js`);
themes.setRegisteredThemes([themes.loadThemeFromPath(join(designDir, 'themes/prompt-blue.json'))]);
themes.initTheme('prompt-blue');
for (const { name, source } of matches) {
  const start = source.indexOf(marker);
  const end = source.indexOf(';var UserMessageList=', start);
  assert(end > start, `Locate renderer end in ${name}`);
  const factory = new Function('Container', 'Markdown', 'truncateToWidth', 'visibleWidth', 'theme', 'getMarkdownTheme', 'createMarkdownTransform', 'OSC133_ZONE_START2', 'OSC133_ZONE_END2', 'OSC133_ZONE_FINAL2', `return (${source.slice(start + 'UserMessageComponent='.length, end)});`);
  const UserMessage = factory(tui.Container, tui.Markdown, tui.truncateToWidth, tui.visibleWidth, themes.theme, themes.getMarkdownTheme, () => undefined, '\x1b]133;A\x07', '\x1b]133;B\x07', '\x1b]133;C\x07');
  for (const text of ['Testing', 'Multiple lines\n\n**Bold** 日本語 👋', '```js\nconst x = 1;\n```', 'x'.repeat(300), '']) {
    for (const width of [1, 2, 3, 4, 10, 40, 80, 120]) {
      const component = new UserMessage(text);
      const lines = component.render(width);
      for (const line of lines) {
        assert(tui.visibleWidth(line) <= width, `Overflow at ${width}`);
        assert(!line.includes('\x1b[48;'), 'Bundled renderer still paints the background');
      }
      if (width >= 3 && lines.length) {
        assert(tui.stripTerminalSequences(lines[0]).startsWith('╭'), 'Missing top outline');
        assert(tui.stripTerminalSequences(lines.at(-1)).endsWith('╯'), 'Missing bottom outline');
        assert(lines.every(line => tui.visibleWidth(line) === width), 'Outline must fill the available width');
      }
      component.setOutputPad(0);
      component.render(width);
      component.invalidate();
      component.render(width);
    }
  }
  console.log(`PASS: ${name} has an outline, no background fill, and fits narrow/Unicode/code-block cases.`);
  console.log(new UserMessage('Testing').render(40).map(tui.stripTerminalSequences).join('\n'));
}
