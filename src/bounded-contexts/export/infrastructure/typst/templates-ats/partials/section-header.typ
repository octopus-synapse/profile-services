// Section Header - ATS version
// Bold text only. NO lines, NO decorative separators.
// ATS validators flag horizontal lines (HORIZONTAL_LINES_DETECTED).

#import "global-styles.typ": map-weight, apply-transform

/// Render a section heading — bold, uppercase, with spacing only.
/// No underlines, no rules, no decorative elements.
#let render-section-header(title-text, title-style, ats-font) = {
  let transformed = apply-transform(title-text, title-style.textTransform)

  block(width: 100%, above: 0.3em, below: 0.15em, {
    text(
      font: ats-font,
      size: 10.5pt,
      weight: "bold",
      fill: black,
      upper(transformed),
    )
  })
}
