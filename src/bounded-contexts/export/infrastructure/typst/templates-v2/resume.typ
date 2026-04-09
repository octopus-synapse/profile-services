// Token-driven Typst template V2.
// ZERO hardcoded visual values — everything reads from data.theme.*.

#let data = json("data.json")
#let t = data.theme
#let header = data.at("header", default: none)
#let sections = data.at("sections", default: ())

// Import partials
#import "partials/header.typ": render-header
#import "partials/section-header.typ": render-section-header
#import "partials/entry.typ": render-entry
#import "partials/bullets.typ": render-bullets
#import "partials/skills-list.typ": render-skills-list
#import "partials/text-section.typ": render-text-section
#import "partials/column-layout.typ": render-column-layout

#set page(
  width: t.page.width * 1mm,
  height: t.page.height * 1mm,
  margin: (
    top: t.page.marginTop * 1mm,
    bottom: t.page.marginBottom * 1mm,
    left: t.page.marginLeft * 1mm,
    right: t.page.marginRight * 1mm,
  ),
  fill: rgb(t.page.background),
)

#set text(
  font: t.global.fontFamily,
  size: t.global.fontSize * 1pt,
  fill: rgb(t.global.color),
)

#set par(
  leading: (t.global.lineHeight - 1) * t.global.fontSize * 0.5pt,
  justify: t.global.justify,
)

#set list(
  indent: t.bullets.indent * 1pt,
  body-indent: t.bullets.bodyIndent * 1pt,
  marker: t.bullets.marker,
  spacing: t.bullets.spacing * 1pt,
)

#render-header(header, t)

#let is-skills-section(section) = {
  if "semanticKind" in section {
    let kind = section.semanticKind
    kind == "SKILL_SET" or kind == "SKILLS" or kind == "skills"
  } else {
    false
  }
}

#let sorted-sections = sections.sorted(key: s => s.at("order", default: 0))

#render-column-layout[
  #for section in sorted-sections {
    let title = section.at("title", default: "")
    if title != "" {
      render-section-header(title, t)
    }

    if "content" in section and type(section.content) == str {
      render-text-section(section.content, t)
    } else if "items" in section and section.items != none and section.items.len() > 0 {
      if is-skills-section(section) {
        render-skills-list(section.items, t)
      } else {
        for item in section.items {
          render-entry(item, t)
        }
      }
    }
  }
]
