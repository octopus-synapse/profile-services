// Text Section - ATS version
// Plain text rendering, no decorative elements.

#import "global-styles.typ": map-weight
#import "section-header.typ": render-section-header

/// Render a text section (summary/objective).
#let render-text-section(section, global-styles, ats-font) = {
  let data = section.data
  let styles = section.styles

  if data.content != none and str(data.content).trim() != "" {
    render-section-header(data.title, styles.title, ats-font)

    block(
      width: 100%,
      below: 8pt,
      {
        text(
          font: ats-font,
          size: 10pt,
          fill: black,
          data.content,
        )
      },
    )
  }
}
