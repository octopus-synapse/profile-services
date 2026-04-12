// Skills list partial — renders skills as separator-joined text.
// All visual values read from theme tokens (t.skillsList.*).

#let render-skills-list(items, t) = {
  let sl = t.skillsList
  let sep = sl.at("separator", default: ", ")

  let skill-names = items.map(item => {
    if type(item) == str { item }
    else if "name" in item { item.name }
    else { "" }
  }).filter(name => name != "")

  if skill-names.len() == 0 { return }

  set text(
    size: sl.fontSize * 1pt,
    fill: rgb(sl.color),
  )

  let joined = skill-names.join(sep)
  [#joined]

  v(sl.at("marginBottom", default: 4) * 1pt)
}
