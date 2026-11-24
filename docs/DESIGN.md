# Design

Clean, organised, minimalist, high-performer feel. Monochrome with a faded look: charcoals and off-whites that read almost as light grey. One red accent, used only for "today" and destructive actions.

## Tokens (in `:root` of app/index.html)

| Token | Light | Dark |
|---|---|---|
| `--bg` | #F1F1EF | #2A2A28 |
| `--surface` (cards) | #F8F8F6 | #343432 |
| `--shade` (soft blocks inside cards) | #EEEEEB | #2E2E2C |
| `--field` (all inputs) | #FCFCFA | #2A2A28 |
| `--ink` | #343432 | #DCDCD7 |
| `--muted` | #75756F | (see file) |
| `--line` | #DCDCD8 | (see file) |
| `--signal` | #C4483C | (see file) |

Fonts: Archivo (headings, heavy, uppercase with tracking for labels), Hanken Grotesk (body). `--mono` is aliased to the body font on purpose; she disliked the typewriter font.

Theme: a toggle sets `data-theme` on `<html>` and stores `lifehub-theme` in localStorage.

## Rules

- Section heading: `vh(title, sub)` — bold uppercase heading, small muted note on the right, 2px line underneath. Every page and every major block uses it.
- Navigation inside a page: `tog(key, items)` — a row of pill buttons, the active one filled.
- Cards: `.card` on `--surface`, 18px radius, 1px line. Card titles are `h2` with a small square bullet.
- Soft shading for structure: add rows (`form.add`), table header rows, day-card headers, calendar weekday chips, and boxes inside cards (`.mini`, `.note`, `.card.inset`) use `--shade`. Never nest a shaded block inside another.
- One input style everywhere (`--field`), 40px tall, 12px radius.
- One tag style: `.pill`.
- Lists of things are boxes in a grid (`.grid .g2/.g3/.g4` with `.mini`), not full-width rows.
- Day cards (`.daycol.fixed`) are a fixed size that fits five rows, with "+ n more".
- Stat tiles: `.tile`, big heavy number, small caption. Soft top-to-bottom fade in light, flat in dark.
- Custom-drawn checkboxes; date and time picker icons are forced dark-on-light / light-on-dark.


## Menu headers (added Nov 2026)

Melissa asked for more hierarchy in the side menu. Group labels (Daily, Direction, Areas, Claude, Hub) are small bars in a faded orange (`--navhd`, text `--navhd-ink`), and the current page has a 3px orange bar on its left (`--navbar`) with a soft fade. This is the one place orange is used; red (`--signal`) stays for "today" and destructive actions. The phone bottom bar is unchanged.

## Phone layout (Nov 2026)

At 760px and below: a sticky top bar (`#mbar`) with the brand, the current page as an orange-tinted label, and a menu button (three lines). The button slides in the full side menu (`nav`, with the same orange group headers) over a dimmed backdrop; tapping a page, the backdrop or Escape closes it. There is no bottom bar. Toggle rows (`.jump`) stay on one line and scroll sideways. Overview box lists use `.rail` (and `.cols`) to scroll sideways with the next card peeking in; the right edge fades and `railHints()` adds a "Swipe for more" line with an orange progress track and an "n of N" count, which disappear at the end. Month and week headers (`.calhead`) put the title on its own line on phones, with round arrow buttons either side of the "This week" / "Today" button. Number tiles sit two to a row. Sections get more space above them than cards get between them.

On phones, a page's main tab row (`tagTabs()` marks the first tab row on each page `.maintabs`, plus the Family section row) uses the menu-header look: faded orange chips with dark uppercase text, the current one solid orange. Every other tab or filter row (`.subtabs`, and `.jump.sub`) is plain text on a thin line, with the current tab underlined in orange. Week views show one day per row.
