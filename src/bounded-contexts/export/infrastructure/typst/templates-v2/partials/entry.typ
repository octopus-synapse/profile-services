// Entry partial — renders a structured entry (work experience, education, etc).
// Title + date on same line, subtitle below, then content/bullets.
// All visual values read from theme tokens (t.entry.*).

#import "bullets.typ": render-bullets

#let render-entry(item, t) = {
  let et = t.entry

  let title-text = item.at("title", default: "")
  let date-text = item.at("date", default: "")

  if title-text != "" or date-text != "" {
    grid(
      columns: (1fr, auto),
      column-gutter: et.at("columnGutter", default: 8) * 1pt,
      [
        #text(
          size: et.title.fontSize * 1pt,
          weight: et.title.fontWeight,
          fill: rgb(et.title.color),
        )[#title-text]
      ],
      [
        #text(
          size: et.date.fontSize * 1pt,
          weight: et.date.at("fontWeight", default: 400),
          fill: rgb(et.date.color),
        )[#date-text]
      ],
    )
  }

  let subtitle-text = item.at("subtitle", default: "")
  if subtitle-text != "" {
    v(et.subtitle.at("marginTop", default: 1) * 1pt)
    text(
      size: et.subtitle.fontSize * 1pt,
      weight: et.subtitle.at("fontWeight", default: 400),
      fill: rgb(et.subtitle.color),
    )[#subtitle-text]
  }

  if "bullets" in item and item.bullets != none and item.bullets.len() > 0 {
    v(et.at("contentMarginTop", default: 4) * 1pt)
    render-bullets(item.bullets, t)
  } else if "content" in item and item.content != none and item.content != "" {
    v(et.at("contentMarginTop", default: 4) * 1pt)
    text(
      size: et.at("contentFontSize", default: t.global.fontSize) * 1pt,
      fill: rgb(et.at("contentColor", default: t.global.color)),
    )[#item.content]
  }

  v(et.at("marginBottom", default: 8) * 1pt)
}
