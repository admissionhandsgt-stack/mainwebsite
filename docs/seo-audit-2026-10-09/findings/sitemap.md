# Sitemap audit: https://www.admissionhands.com/sitemap.xml (2026-10-09)

Score: 91/100

## Validation report
| Check | Result |
|---|---|
| Discovery | PASS. Declared in robots.txt (absolute URL). It is the only candidate: sitemap_index.xml, sitemap-index.xml and wp-sitemap.xml all return 404. |
| XML validity | PASS. Parses cleanly, UTF-8, correct urlset namespace, Content-Type application/xml, HTTP 200. |
| Size and count | PASS. 3,760 URLs (limit 50,000). 827 KB uncompressed (limit 50 MB), 68 KB gzipped. |
| Duplicates | PASS. 0 duplicate locs. |
| URL form | PASS. All https + www, no trailing slashes (except `/`), no queries, all lowercase, pure ASCII, 0 percent-encoded or `&` characters. The earlier raw-`&` slug bug is fixed. |
| lastmod format | PASS. 3,646 of 3,760 carry one, all valid W3C dates (`YYYY-MM-DD`). |
| lastmod plausibility | PASS with notes (below). |
| priority / changefreq | INFO. Present on all 3,760 URLs. Google ignores both. |
| Sample of 41 URLs | PASS. 41/41 returned 200, canonical equal to the URL, no meta robots and no X-Robots-Tag. No redirects. 41 distinct titles. |
| Nav coverage | PASS. Every indexable internal link in the homepage header, footer and body is in the sitemap. |
| Quality gate (location pages) | N/A. These are not city-swapped pages: each is built from its own seat data (cutoffs, fees, quotas), with anonymous visitors gated per the paywall markup. |

### URL families
| Family | URLs | lastmod |
|---|---|---|
| /md-ms-india/colleges/[slug] | 2,168 | 2026-09-17 |
| /mbbs-india/colleges/[slug] | 1,309 | 2026-09-22 |
| /md-ms-india/branches/[slug] | 101 | 2026-09-17 |
| /neet-ss/[slug] | 74 | none |
| /md-ms-india/states/[slug] | 35 | 2026-09-17 |
| /mbbs-india/[state] | 33 | 2026-09-22 |
| /neet-mds/[slug] | 9 | none |
| Hubs and static pages | ~31 | none |

## Findings

### Medium
1. **One flat sitemap hides the 7% of URLs that are not college pages.** 3,477 of 3,760 URLs (92%) are college pages. In Search Console, "Discovered / Indexed" for the 283 hub, branch, state, SS and MDS pages is lost inside one number. Those are the pages built for the high-volume search clusters.
   - Fix: serve `/sitemap.xml` as a sitemap index, with child files per family: `sitemap-pg-colleges.xml` (2,168), `sitemap-ug-colleges.xml` (1,309), `sitemap-branches.xml` (101), `sitemap-states.xml` (35 PG + 33 UG), `sitemap-ss-mds.xml` (83), `sitemap-core.xml` (hubs and static pages).
   - Search Console then shows submitted vs indexed per family. This is for monitoring only. There is no technical need to split, because the file is far below the limits.
   - Keep each child's `lastmod` honest, and give the index entries a `lastmod` equal to the newest child URL.

### Low
2. **NEET SS (74) and NEET MDS (9) pages have no lastmod, although their data was loaded on 2026-10-08.** Static pages omit lastmod on purpose, but these are data pages. Use the `ss_allotments` / `mds_allotments` load date, as is already done for the PG and UG families.
3. **lastmod is real but coarse.** Only two distinct values exist (2026-09-17 for PG, 2026-09-22 for UG), so every page in a family changes on the same day. That is accurate for an import-driven site and not a boilerplate "now" stamp. It is the "data changed" date that the code derives from `institutes.updated_at`. Keep it as is. The caveat is that substantive on-page changes that did not touch institute rows will not move lastmod. Examples are the title rewrites of 2026-10-07 and the new FAQ blocks. Consider bumping lastmod when `page_seo` or the copy changes, so Google recrawls improved titles sooner.
4. **priority and changefreq are on every URL and are ignored by Google.** About 190 KB of the 827 KB is this dead markup. They are harmless. They could be removed to shrink the file, and the child sitemaps would be tidier without them. `priority=0.6` on 3,596 URLs is also uninformative.
5. **Very long college slugs.** 476 slugs are over 80 characters, 235 are over 100 and 53 are over 150. The maximum full URL is 232 characters. The long ones carry street addresses, PIN codes and "dist-dhule-at-post..." fragments. Example: `pt-shivnath-shastri-govt-auto-ayurved-college-and-hospital-burhanpur-madhya-pradesh-mohammadpura-behind-macrovision-school-burhanpur-mp-madhya-pradesh-450331-ug`. They are valid and resolve, but they are ugly in the SERP and in shared links. Changing them would need 301s from the old slugs, so it is a low-priority cleanup.
6. **The /mbbs-india/colleges/ path holds non-MBBS institutions.** Slugs end in `-ug`, and 471 contain dental, ayurved, homoeo, nursing or similar terms. Sampled titles confirm "BDS Cutoff" and "BAMS Cutoff" pages under an `/mbbs-india/` path. The pages work and are self-canonical. The mismatch is a topical-signal and URL-structure issue only, not a sitemap error.
7. **Known orphan: `/mbbs-india/colleges/mes-dental-college-malappuram-ug`.** It is in the sitemap and returns 200, self-canonical and indexable, with the title "MES Dental College, Malappuram - BDS Cutoff & Fees 2026". It has no inbound internal link, which matches the known misfiled source record. Decide whether to keep it, fix the record, or drop it from the sitemap. An orphan in the sitemap is acceptable but sends a weak signal.
8. **robots.txt contains `Host: https://www.admissionhands.com`.** This is a Yandex-only directive that has been deprecated, and Google ignores it. It is harmless and could be removed. The `Sitemap:` line is correct and absolute.

### Passes worth keeping
- No noindexed, redirected or non-200 URL was found in the 41-URL sample. A full-sitemap status sweep was not run (rate-limit constraint). The sampling was stratified across families: 11 PG colleges, 11 UG colleges, 4 branches, 3 SS, 3 PG states, 1 MDS, 2 UG states and 6 hubs, plus the known orphan.
- No indexable page linked from the homepage nav, footer or body is missing from the sitemap. All 38 internal page links are present. The links not in the sitemap are `/login` (noindex by design), assets and icons.
- There is no `/privacy-policy` or `/contact` page (both 404). Privacy and terms live as anchors inside the single `/terms` page, which is in the sitemap. That is a content/trust observation rather than a sitemap gap.
- Unknown slugs return a true 404 (`/mbbs-india/colleges/does-not-exist`), so the sitemap cannot be polluted by soft-404s.
- The Search Console report of 0 errors is consistent with what was found.

## Missing pages (in nav, not in sitemap)
None indexable.

## Extra pages (in sitemap but non-200 or redirected)
None found in the sample. The known orphan is 200 but unlinked.

## Suggested index skeleton
```xml
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.admissionhands.com/sitemap-core.xml</loc></sitemap>
  <sitemap><loc>https://www.admissionhands.com/sitemap-pg-colleges.xml</loc><lastmod>2026-09-17</lastmod></sitemap>
  <sitemap><loc>https://www.admissionhands.com/sitemap-ug-colleges.xml</loc><lastmod>2026-09-22</lastmod></sitemap>
  <sitemap><loc>https://www.admissionhands.com/sitemap-branches-states.xml</loc><lastmod>2026-09-22</lastmod></sitemap>
  <sitemap><loc>https://www.admissionhands.com/sitemap-ss-mds.xml</loc><lastmod>2026-10-08</lastmod></sitemap>
</sitemapindex>
```
Keep robots.txt pointing at the index, and resubmit the index in Search Console. The old `/sitemap.xml` property entry then becomes the index.
