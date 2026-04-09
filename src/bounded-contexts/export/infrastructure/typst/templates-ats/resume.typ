// ATS-Optimized Resume Template
// Designed for perfect ATS score (100/100).
// Enforces: single-column, ATS-safe font, no decorative elements,
// high contrast, standard A4, normal margins.

#import "partials/global-styles.typ": parse-color, map-weight
#import "partials/column-layout.typ": render-columns
#import "partials/item-section.typ": render-item-section
#import "partials/text-section.typ": render-text-section

// Load resume data
#let data = json("data.json")
#let page-config = data.page
#let global-styles = data.globalStyles
#let sections = data.sections
#let header = data.at("header", default: none)

// ATS-safe font override — ignore theme font entirely
#let ats-font = "Calibri"

// Force A4, white background, normal margins (20mm)
#set page(
  width: 210mm,
  height: 297mm,
  margin: (
    top: 20mm,
    bottom: 20mm,
    left: 20mm,
    right: 20mm,
  ),
  fill: white,
)

// Force ATS-safe defaults: Calibri, black text, 11pt
#set text(
  font: ats-font,
  size: 11pt,
  fill: black,
)

#set par(
  leading: 0.65em,
  justify: false,
)

// Header renderer — ATS-safe: plain text, no decoration
#if header != none {
  let name = header.at("fullName", default: none)
  if name != none {
    align(center, text(font: ats-font, size: 18pt, weight: "bold", fill: black, name))
  }

  let job-title = header.at("jobTitle", default: none)
  if job-title != none {
    align(center, text(font: ats-font, size: 11pt, fill: luma(60), job-title))
  }

  v(4pt)

  {
    let items = ()
    let email = header.at("email", default: none)
    if email != none { items.push(email) }
    let phone = header.at("phone", default: none)
    if phone != none { items.push(phone) }
    let linkedin = header.at("linkedin", default: none)
    if linkedin != none {
      let clean = str(linkedin).replace("https://", "").replace("http://", "")
      items.push(clean)
    }
    let github = header.at("github", default: none)
    if github != none {
      let clean = str(github).replace("https://", "").replace("http://", "")
      items.push(clean)
    }
    let website = header.at("website", default: none)
    if website != none {
      let clean = str(website).replace("https://", "").replace("http://", "")
      items.push(clean)
    }
    let location = header.at("location", default: none)
    if location != none { items.push(location) }

    if items.len() > 0 {
      align(center, text(font: ats-font, size: 9pt, fill: luma(80), items.join("  |  ")))
    }
  }

  v(8pt)
  line(length: 100%, stroke: 0.5pt + black)
  v(6pt)
}

// Section renderer dispatcher
#let render-section(section, gs) = {
  let data = section.data
  if data.keys().contains("items") {
    render-item-section(section, gs, ats-font)
  } else if data.keys().contains("content") and type(data.content) == str {
    render-text-section(section, gs, ats-font)
  }
}

// Force single-column: pass only one column regardless of data
#render-columns(
  sections,
  ((id: "main", widthPercentage: 100, order: 0),),
  0,
  render-section,
  global-styles,
)
