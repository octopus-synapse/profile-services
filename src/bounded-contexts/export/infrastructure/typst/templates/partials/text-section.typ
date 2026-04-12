// Text Section

#import "global-styles.typ": parse-color, map-weight
#import "section-header.typ": render-section-header

#let render-text-section(section, global-styles) = {
  let data = section.data
  let styles = section.styles

  if data.content != none and str(data.content).trim() != "" {
    render-section-header(data.title, styles.title, global-styles.accent)
    block(width: 100%, below: 0pt, {
      text(size: 8.5pt, fill: rgb("#2a2a2a"), data.content)
    })
  }
}
