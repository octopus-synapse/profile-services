// Resume Template

#import "partials/global-styles.typ": parse-color, map-weight
#import "partials/column-layout.typ": render-columns
#import "partials/item-section.typ": render-item-section
#import "partials/text-section.typ": render-text-section

#let data = json("data.json")
#let page-config = data.page
#let global-styles = data.globalStyles
#let sections = data.sections
#let header = data.at("header", default: none)

// ─── Page ───
#set page(
  width: 210mm, height: 297mm,
  margin: (top: 10mm, bottom: 10mm, left: 16mm, right: 16mm),
  fill: white,
)

#set text(font: "Inter", size: 9.5pt, fill: rgb("#1a1a1a"))
#set par(leading: 4.5pt, justify: true)
#set list(indent: 0pt, body-indent: 5pt, marker: [--], spacing: 4pt)

// ─── Header ───
#if header != none {
  let name = header.at("fullName", default: none)
  if name != none {
    align(center, text(size: 22pt, weight: "bold", fill: rgb("#0f0f0f"), tracking: 0.6pt, name))
  }
  v(1.5pt)
  let job-title = header.at("jobTitle", default: none)
  if job-title != none {
    align(center, text(size: 9.5pt, fill: rgb("#555555"), tracking: 0.2pt, job-title))
  }
  v(4pt)
  {
    let items = ()
    let email = header.at("email", default: none)
    if email != none { items.push(email) }
    let phone = header.at("phone", default: none)
    if phone != none { items.push(phone) }
    let linkedin = header.at("linkedin", default: none)
    if linkedin != none { items.push(str(linkedin).replace("https://", "").replace("http://", "")) }
    let github = header.at("github", default: none)
    if github != none { items.push(str(github).replace("https://", "").replace("http://", "")) }
    if items.len() > 0 {
      align(center, text(size: 8pt, fill: rgb("#555555"), items.join(text(fill: rgb("#cccccc"), "  ·  "))))
    }
  }
  v(5pt)
  line(length: 100%, stroke: 0.8pt + rgb("#1a1a1a"))
  v(2pt)
}

// ─── Section dispatcher ───
#let render-section(section, gs) = {
  let data = section.data
  if data.keys().contains("items") {
    render-item-section(section, gs)
  } else if data.keys().contains("content") and type(data.content) == str {
    render-text-section(section, gs)
  }
}

// ─── Render with page break after experience ───
#let sorted-sections = sections.sorted(key: s => s.order)
#let experience-keys = ("work_experience_v1",)

#for (idx, section) in sorted-sections.enumerate() {
  let sk = section.data.at("sectionTypeKey", default: "")
  let prev-sk = if idx > 0 { sorted-sections.at(idx - 1).data.at("sectionTypeKey", default: "") } else { "" }

  // Page break when transitioning OUT of experience into a non-experience section
  if idx > 0 and experience-keys.contains(prev-sk) and not experience-keys.contains(sk) {
    pagebreak()
  }

  render-section(section, global-styles)
}
