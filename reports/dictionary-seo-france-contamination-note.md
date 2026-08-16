# France contamination handling

The GSC country aggregate reports **118 clicks from 178 impressions** for France. This is classified as **OWNER/DEVELOPER TESTING CONTAMINATION**, not genuine market demand.

France is excluded from genuine-country conclusions and ranking logic. It is **not** subtracted from page or query rows because GSC dimension exports cannot support row-level allocation. Every page/query metric is therefore labeled `GLOBAL AGGREGATE — FRANCE CONTAMINATION POSSIBLE`. Global clicks receive zero weight in the candidate priority score.

Bangladesh-filtered GSC Pages and Queries exports are required before assigning country-level confidence to a URL or query.
