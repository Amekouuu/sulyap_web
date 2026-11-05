# Screening lists (draft)

The automatic nomination checks use two lists. Both are drafts made from public sources and
need a review by the team (and ideally ACTOP) before evaluation.

| File | What it holds | Load with |
| --- | --- | --- |
| `server/db/seeds/screening/known-destinations.csv` | 41 places and festivals that are already promoted | `npm run db:seed:screening` |
| `server/db/seeds/screening/prohibited-terms.csv` | 412 English and 43 Filipino terms | same command |

Running the command again is safe: entries already in the database are skipped. After Phase B4,
the administrator can also add or remove entries on the **Screening Lists** page.

## Known / already-promoted destinations

Each row has the page it came from in the `source` column. Sources used:

- Grab's top attractions in Pampanga (grab.com/ph/attractions/pampanga)
- Pueblo de Oro's nature and things-to-do guides for Pampanga
- Wikipedia: Pampanga, List of Baroque churches in the Philippines, List of festivals in the Philippines
- Tourism Promotions Board itinerary (San Fernando heritage tour)
- Hotels.com, SmarterTravel, TransitPinas, and Ivan Henares's heritage blog

Things to check (marked in the `note` column):

- **Clark Freeport attractions** were assigned to Mabalacat City or Angeles City by best guess.
- **Puning Hot Spring** is listed as Angeles by the source but is usually given as Porac.
- **Mount Pinatubo** is shared with Tarlac and Zambales; Porac was assigned.
- **Candaba Swamp** overlaps the demo nomination "Candaba Swamp Birding Deck". Decide whether the
  birding deck still counts as lesser-known.

## Prohibited terms

- **English (412):** the LDNOOBW list (github.com/LDNOOBW), licensed CC-BY-4.0, minus 11 words that
  are ordinary words in Filipino or tourism text (guro, paki, poon, mong, cock, suck, butt, nude,
  sexy, xx, scat). Plus 20 spam and self-promotion phrases ("book now", "dm us", "online sabong").
- **Filipino (43):** the 13 LDNOOBW Filipino terms, 21 common Tagalog insults and profanity, and 9
  spam phrases ("pm lang", "pautang"). The added ones are marked "Drafted by Claude; needs team review".
- **Kapampangan (0):** no public list was found.

Matching is whole-word and case-insensitive, so "class" does not match "ass".

## Not found / still needed from the team

1. **ACTOP's official inventory** of promoted destinations. Not public; request it from ACTOP.
2. **DOT Region III's list.** No official per-town list was found online.
3. **Kapampangan prohibited words.** Needs native speakers on the team or at ACTOP.
4. **Each city's or municipality's own featured spots.** Mostly on LGU Facebook pages, which
   could not be read. Nine towns have no entry yet: Floridablanca, Macabebe, Magalang, Masantol,
   Mexico, San Luis, San Simon, Santa Ana, and Santo Tomas.
5. **TripAdvisor rankings.** The site could not be read; travel-site lists were used instead.

## For the paper

Describe the lists as they are, for example: "compiled from DOT, LGU, and public travel sources
and reviewed by the researchers". Mention ACTOP only if ACTOP supplied or reviewed them. The
LDNOOBW list requires attribution (CC-BY-4.0).
