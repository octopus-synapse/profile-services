<div align="center">

# CI Pipeline Status

<table>
<tr>
<td align="center"><strong>Branch</strong></td>
<td align="center"><strong>Commit</strong></td>
<td align="center"><strong>Status</strong></td>
<td align="center"><strong>Duration</strong></td>
</tr>
<tr>
<td><code>refactor/consolidate-test-actions</code></td>
<td><code>7e918eb</code></td>
<td><img src="https://img.shields.io/badge/-IN_PROGRESS-F59E0B?style=for-the-badge" /></td>
<td><code>4m 58s</code></td>
</tr>
</table>

</div>

---

<details open>
<summary><h2><img src="https://api.iconify.design/carbon/checkmark-filled.svg?color=%2322c55e" width="20" height="20" /> Pre-commit Attestation</h2></summary>

<table width="100%">
<tr>
<th align="left" width="25%">Check</th>
<th align="center" width="15%">Status</th>
<th align="center" width="15%">Time</th>
<th align="center" width="15%">Passed</th>
<th align="center" width="15%">Failed</th>
<th align="center" width="15%">Skipped</th>
</tr>
<tr>
<td><img src="https://api.iconify.design/logos/swagger.svg" width="16" height="16" /> <strong>Swagger</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-PASS-22c55e?style=flat-square" /></td>
<td align="center"><code>1.5s</code></td>
<td align="center">-</td>
<td align="center">-</td>
<td align="center">-</td>
</tr>
<tr>
<td><img src="https://api.iconify.design/logos/typescript-icon.svg" width="16" height="16" /> <strong>TypeCheck</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-PASS-22c55e?style=flat-square" /></td>
<td align="center"><code>3.3s</code></td>
<td align="center">-</td>
<td align="center">-</td>
<td align="center">-</td>
</tr>
<tr>
<td><img src="https://api.iconify.design/logos/biomejs.svg" width="16" height="16" /> <strong>Lint (Biome)</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-PASS-22c55e?style=flat-square" /></td>
<td align="center"><code>0.8s</code></td>
<td align="center">-</td>
<td align="center">-</td>
<td align="center">-</td>
</tr>
<tr>
<td><img src="https://api.iconify.design/logos/jest.svg" width="16" height="16" /> <strong>Unit Tests</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-PASS-22c55e?style=flat-square" /></td>
<td align="center"><code>3.7s</code></td>
<td align="center"><strong>2036</strong></td>
<td align="center">0</td>
<td align="center">0</td>
</tr>
<tr>
<td><img src="https://api.iconify.design/carbon/architecture.svg?color=%236366f1" width="16" height="16" /> <strong>Architecture</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-PASS-22c55e?style=flat-square" /></td>
<td align="center"><code>1.0s</code></td>
<td align="center"><strong>42</strong></td>
<td align="center">0</td>
<td align="center">1</td>
</tr>
<tr>
<td><img src="https://api.iconify.design/carbon/document-signed.svg?color=%238b5cf6" width="16" height="16" /> <strong>Contracts</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-PASS-22c55e?style=flat-square" /></td>
<td align="center"><code>0.5s</code></td>
<td align="center"><strong>45</strong></td>
<td align="center">0</td>
<td align="center">0</td>
</tr>
</table>

<table>
<tr>
<td><img src="https://api.iconify.design/carbon/security.svg?color=%2222c55e" width="14" height="14" /> <strong>Attestation</strong></td>
<td><code>602e1695cd918a6222602cccd664db57773ffb87</code></td>
<td><img src="https://api.iconify.design/carbon/time.svg?color=%233b82f6" width="14" height="14" /> <strong>Total</strong></td>
<td><code>10.3s</code></td>
<td><img src="https://api.iconify.design/carbon/user.svg?color=%236b7280" width="14" height="14" /> <strong>Author</strong></td>
<td><code>enzo.patti</code></td>
</tr>
</table>

</details>

---

<details open>
<summary><h2><img src="https://api.iconify.design/carbon/workflow-automation.svg?color=%233b82f6" width="20" height="20" /> CI/CD Jobs</h2></summary>

<table width="100%">
<tr>
<th align="left" width="25%">Job</th>
<th align="center" width="15%">Status</th>
<th align="center" width="15%">Duration</th>
<th align="center" width="15%">Passed</th>
<th align="center" width="15%">Failed</th>
<th align="left" width="15%">Details</th>
</tr>
<tr>
<td><img src="https://api.iconify.design/logos/docker-icon.svg" width="16" height="16" /> <strong>Build</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-PASS-22c55e?style=flat-square" /></td>
<td align="center"><code>45s</code></td>
<td align="center">-</td>
<td align="center">-</td>
<td><code>pr-190-7e918eb</code></td>
</tr>
<tr>
<td><img src="https://api.iconify.design/carbon/data-base.svg?color=%23f59e0b" width="16" height="16" /> <strong>Integration</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-FAIL-ef4444?style=flat-square" /></td>
<td align="center"><code>2m 27s</code></td>
<td align="center">127</td>
<td align="center"><strong>1</strong></td>
<td>Unique constraint</td>
</tr>
<tr>
<td><img src="https://api.iconify.design/logos/playwright.svg" width="16" height="16" /> <strong>E2E</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-PASS-22c55e?style=flat-square" /></td>
<td align="center"><code>1m 26s</code></td>
<td align="center">48</td>
<td align="center">0</td>
<td>-</td>
</tr>
<tr>
<td><img src="https://api.iconify.design/carbon/shield-check.svg?color=%2222c55e" width="16" height="16" /> <strong>Security</strong></td>
<td align="center"><img src="https://img.shields.io/badge/-PASS-22c55e?style=flat-square" /></td>
<td align="center"><code>22s</code></td>
<td align="center">-</td>
<td align="center">0 vulns</td>
<td>-</td>
</tr>
</table>

</details>

---

<details>
<summary><h3><img src="https://api.iconify.design/carbon/warning-filled.svg?color=%23ef4444" width="16" height="16" /> Failed: Integration Tests</h3></summary>

```
test/infrastructure/integration/onboarding.integration.spec.ts

  ✗ Onboarding > should complete onboarding flow

    Error: Unique constraint failed on the fields: (`username`)

    at handleRequestError (node_modules/@prisma/client/runtime/client.js:65:8292)
    at OnboardingCompletionService.completeOnboarding (src/bounded-contexts/onboarding/services/onboarding-completion.service.ts:122:19)
```

</details>

---

<div align="center">

<table>
<tr>
<td align="center">
<img src="https://api.iconify.design/carbon/cube.svg?color=%236b7280" width="12" height="12" />
<strong>Total Tests</strong><br/>
<code>2253</code>
</td>
<td align="center">
<img src="https://api.iconify.design/carbon/checkmark.svg?color=%2322c55e" width="12" height="12" />
<strong>Passed</strong><br/>
<code>2252</code>
</td>
<td align="center">
<img src="https://api.iconify.design/carbon/close.svg?color=%23ef4444" width="12" height="12" />
<strong>Failed</strong><br/>
<code>1</code>
</td>
<td align="center">
<img src="https://api.iconify.design/carbon/time.svg?color=%233b82f6" width="12" height="12" />
<strong>Duration</strong><br/>
<code>4m 58s</code>
</td>
<td align="center">
<img src="https://api.iconify.design/carbon/percentage.svg?color=%238b5cf6" width="12" height="12" />
<strong>Pass Rate</strong><br/>
<code>99.96%</code>
</td>
</tr>
</table>

<sub>
<img src="https://api.iconify.design/carbon/time.svg?color=%236b7280" width="10" height="10" />
Updated: 2026-04-05 11:15:32 UTC
</sub>

</div>
