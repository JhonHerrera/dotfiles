// Exact replacements for Pi's user-message renderer, tested with Pi 1.5.0.
// Refuse unfamiliar code rather than guessing after an update.
export const sourceEdits = [
  ['import { Container, Markdown }', 'import { Container, Markdown, visibleWidth, truncateToWidth }'],
  ['        // The Markdown pads and colors its own background: a Box around it would keep a second full-width copy of every\n        // line, with identical output.', '        // Local customization: use a rounded outline instead of a filled panel.'],
  ['            bgColor: (content) => theme.bg("userMessageBg", content),\n', ''],
  ['        const lines = super.render(width);', `        const innerWidth = Math.max(1, width - 2);
        const contentWidth = width >= 3 ? innerWidth : width;
        let lines = super.render(contentWidth).map(line => truncateToWidth(line, contentWidth, ""));
        if (width >= 3 && lines.length > 0) {
            const border = (text) => theme.fg("border", text);
            lines = [
                border("╭" + "─".repeat(innerWidth) + "╮"),
                ...lines.map(line => border("│") + line + " ".repeat(Math.max(0, innerWidth - visibleWidth(line))) + border("│")),
                border("╰" + "─".repeat(innerWidth) + "╯"),
            ];
        }`],
];

export const bundleEdits = [
  ['color:content=>theme.fg("userMessageText",content),bgColor:content=>theme.bg("userMessageBg",content)', 'color:content=>theme.fg("userMessageText",content)'],
  ['render(width){let lines=super.render(width);return lines.length===0||(lines[0]=OSC133_ZONE_START2+lines[0],lines[lines.length-1]=OSC133_ZONE_END2+OSC133_ZONE_FINAL2+lines[lines.length-1]),lines}', 'render(width){let innerWidth=Math.max(1,width-2),contentWidth=width>=3?innerWidth:width,lines=super.render(contentWidth).map(line=>truncateToWidth(line,contentWidth,""));if(width>=3&&lines.length>0){let border=text=>theme.fg("border",text);lines=[border("╭"+"─".repeat(innerWidth)+"╮"),...lines.map(line=>border("│")+line+" ".repeat(Math.max(0,innerWidth-visibleWidth(line)))+border("│")),border("╰"+"─".repeat(innerWidth)+"╯")]}return lines.length===0||(lines[0]=OSC133_ZONE_START2+lines[0],lines[lines.length-1]=OSC133_ZONE_END2+OSC133_ZONE_FINAL2+lines[lines.length-1]),lines}'],
];

export function applyEdits(text, edits) {
  // A fully patched file is a no-op. A partially patched file is rejected.
  if (edits.every(([before, after]) => !text.includes(before) && (!after || text.includes(after)))) return text;
  for (const [before, after] of edits) {
    if (text.split(before).length !== 2) {
      throw new Error('Unrecognized or partially patched Pi renderer. No files changed. Review outline-patch.mjs for this Pi version.');
    }
    text = text.replace(before, () => after);
  }
  return text;
}

export const bundleMarker = 'UserMessageComponent=class extends Container';
export function bundleRenderer(source) {
  const start = source.indexOf(bundleMarker);
  const end = source.indexOf(';var UserMessageList=', start);
  if (start < 0 || end <= start || source.indexOf(bundleMarker, start + 1) >= 0) {
    throw new Error('Cannot identify the bundled user-message renderer.');
  }
  return { start, end, text: source.slice(start, end) };
}

export function patchBundle(source) {
  const renderer = bundleRenderer(source);
  return source.slice(0, renderer.start) + applyEdits(renderer.text, bundleEdits) + source.slice(renderer.end);
}
