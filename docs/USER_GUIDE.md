# Sulyap User Guide

Sulyap is a platform for lesser-known tourist destinations in Pampanga. This guide explains how to open
it, what each type of user can do, and the steps for each task.

## Contents

1. [Getting started](#1-getting-started)
2. [Guest users](#2-guest-users)
3. [Registered users](#3-registered-users)
4. [Administrators](#4-administrators)
5. [Local Tourism Officers](#5-local-tourism-officers)
6. [Automatic processes](#6-automatic-processes)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Getting started

### User roles

| Role | Who they are | Main work |
| --- | --- | --- |
| Guest | Anyone visiting the site | Browse destinations and the map |
| Registered User | A visitor with a verified account and ID | Nominate places, write reviews, report content |
| Administrator | The Sulyap team (one shared account) | Verify IDs, screen nominations, moderate content |
| Local Tourism Officer | Tourism staff of a city or municipality | Check routed nominations and endorse them |

### How a destination becomes public

1. A Registered User nominates a place.
2. An administrator screens the nomination and routes it to the officer of that town.
3. The officer checks it against three criteria and endorses it.
4. The endorsed destination appears on the public site, where users can review it.

### Running Sulyap on your computer

1. Open the project folder `D:\New folder (3)\SULYAP` in VS Code.
2. Check that `server/.env` is filled in (database, Supabase, and seed passwords).
3. Open a terminal in the folder and run:
   ```
   npm run dev
   ```
4. Open http://localhost:5173 in a browser.

Press `Ctrl + C` in the terminal to stop it.

The website is also published at https://sulyap-web.vercel.app. Its server is not online yet, so
use your computer for testing until then.

### Test accounts

| Account | Role | Password |
| --- | --- | --- |
| `admin@sulyap.site` | Administrator | `SEED_STAFF_PASSWORD` in `server/.env` |
| `lto.main@sulyap.site` | Officer for all 22 cities and municipalities | `SEED_STAFF_PASSWORD` |
| `lto.mabalacat@example.com` | Officer for Mabalacat City only | `SEED_DEMO_PASSWORD` |
| `lto.angeles@example.com` | Officer for Angeles City only | `SEED_DEMO_PASSWORD` |
| `juan.delacruz@example.com` and other `@example.com` users | Registered Users at different stages | `SEED_DEMO_PASSWORD` |

On your computer only:

- The Log in page has a "Development: open an account" panel. Click an account to sign in without
  typing its password. The panel never appears on the live site.
- E-mails are not actually sent. Read them, and click their links, at http://localhost:5173/dev/outbox.

---

## 2. Guest users

Guests need no account. They can:

- see the most recently endorsed destinations on the Home page,
- search and filter the destination list,
- open a destination's page with its photos, details, map, and reviews,
- explore the map of Pampanga and see similar places,
- create an account.

### Browse destinations

1. **Home** shows the three most recently endorsed destinations and the six categories. Type in the
   search box, or click a category, to go to the destination list.
2. **Destinations** lists every endorsed place, newest endorsement first.
   - Select one or more categories, and use **Season**, **Municipality**, and **Sort** (Recently
     endorsed, or A to Z).
   - A season filter shows only places tagged with that season. Untagged places appear under **All**.
   - The filters are kept in the address, so a filtered list can be bookmarked or shared.
3. Click a destination to open its page.
   - Use the arrows, or swipe, to see the photos.
   - The details include the fee, opening hours, best time to visit, safety reminders, and the
     endorsement date.
   - The **Location** map is below the details. **Open in the map** opens the full map at this place.
   - **Reviews** and **Similar destinations** are on the right (below the details on a phone). Only
     reviews and photos approved by an administrator are shown.

### Use the map

1. Open **Map**. Only Pampanga can be viewed; the neighboring provinces are greyed out.
2. Click a pin to see the place in the side panel, then **View details** to open its page.
3. **Similar Places** lists places like the selected one. Tick **Show only these on the map** to hide
   the other pins.

---

## 3. Registered users

A Registered User can do everything a guest can, and also:

- nominate a destination,
- write one review per destination, with a rating and up to 3 photos,
- report a review, photo, or destination,
- track their nominations and reviews in **My Contributions**,
- find endorsed places near their home,
- receive notifications and the monthly newsletter,
- change their password, newsletter setting, and home location in **Account Settings** (click your
  name in the header).

### Create an account

1. Click **Sign up**.
2. Enter your full name, e-mail, contact number, and password, and tick the Terms box. The newsletter
   box is optional.
3. Open the verification e-mail and click **Verify e-mail**. The link is valid for 24 hours. If no
   e-mail arrives, wait for the countdown and click **Send a new link**.
4. On the **E-mail verified** page, click **Continue: upload your ID**.
5. Choose the ID type and add a photo of the front of the ID (JPG or PNG, up to 5 MB). Click
   **Submit for verification**.
6. Wait for an administrator. The result arrives by e-mail and as a notification.
   - **Verified:** you can now post.
   - **Rejected:** the reason is shown. Upload a new ID from the same page.

Until every step is done, a yellow bar at the top of each page says what to do next.

### Nominate a destination

1. Click **Nominate a destination** (on Home, or in My Contributions under My Nominations).
2. Enter the name and choose the city or municipality. The map moves to that town.
3. Click the exact spot on the map, and drag the pin to adjust it. Places outside Pampanga cannot be
   pinned.
4. Once the name, town, and pin are filled in, you can click **Save draft** at any time. Drafts are
   listed in My Nominations, where you can continue or delete them.
5. Add the address, a description of at least 30 characters, at least one category, the opening
   hours, and 1 to 5 photos. Click **Make main** on the photo that should be shown first.
6. Click **Submit nomination**. Sulyap checks it automatically:
   - Words that are not allowed stop the submission. They are listed so you can remove them.
   - A similar name in the same town, or a place that is already promoted, shows a list of matches.
     Click **Go back and edit**, or **Submit anyway** if yours is a different place.
7. The nomination waits for an administrator. If it is returned, the remarks appear at the top of
   the form. Make the changes and click **Submit again**.

### Write a review

1. On an endorsed destination, click **Write a review**.
2. Choose 1 to 5 stars. Text and up to 3 photos are optional.
3. Submit. The review becomes public after an administrator approves it. Follow its status in
   **My Reviews**.

### Report content

1. Click **Report** under a review, the flag on a review photo, or **Report wrong information** under
   a destination's details.
2. Choose a reason. Details are required for "Wrong information".
3. Submit. Each item can be reported once until an administrator handles it. Your own posts cannot be
   reported.

### Find places near home

1. Open **Map** and click the **Nearby** tab.
2. The first time, set your home location in one of two ways:
   - **Type my address**, click **Search**, choose the right match, and click **Save home location**.
     The search uses OpenStreetMap; only the address you type is sent.
   - **Drop a pin**: click your home on the map (Pampanga only) and save.
3. Choose **5 km**, **10 km**, or **20 km**. Endorsed places within that distance are listed nearest
   first, and a dashed circle marks the area. Tick **Show only these on the map** to hide the rest.

Distances are measured in a straight line, so travel by road is longer. Your home location is never
shown to other users. Change or remove it with **Change** in the Nearby tab, or in Account Settings.

### Notifications and the newsletter

- The bell in the header shows the number of unread notifications and updates every minute. Click
  it to open **Notifications**, where you can **Open** the related page, **Mark as read**, or
  **Mark all as read**. The **Unread** tab shows only new ones.
- Every notification is also sent by e-mail: ID results, nominations returned, rejected, or
  endorsed, and posts removed.
- The monthly newsletter lists the destinations endorsed in the past month. No issue is sent in a
  month with no new endorsements. Turn it on or off in Account Settings, or click **Unsubscribe** in
  any issue (no login needed).

---

## 4. Administrators

Log in with `admin@sulyap.site` to open the **Admin console**. The menu is on the left; on a phone,
tap the menu icon. The number beside a menu item shows how many items are waiting.

| Menu item | Purpose |
| --- | --- |
| Dashboard | Counts and pending work |
| ID Verification | Approve or reject uploaded IDs |
| Users | Suspend accounts and set officer jurisdictions |
| Destinations | Screen nominations and take destinations off the site |
| Community Content | Approve or remove reviews and photos |
| Reports | Handle reports from users |
| Screening Lists | Edit prohibited words and already-promoted places |

To change the shared password, click the name at the bottom of the menu.

Suggested daily order: ID Verification, then Destinations (Pending screening), Community Content, and
Reports.

### Verify an ID

1. Open **ID Verification**. The **Pending review** tab lists the IDs waiting.
2. Click a name. The ID photo is shown next to the account details. The photo link expires after
   5 minutes; reload the page to see it again.
3. Check that the ID is readable, not expired, and that the name matches the account.
4. Answer **Does the name match the account?**
   - If yes, click **Verify ID**.
   - If not, or there is another problem, click **Reject**, choose or type a reason, and click
     **Reject and notify user**. The user sees the reason.

The ID photo is deleted 24 hours after the decision. Only the status, ID type, administrator, and
date are kept.

### Manage accounts

1. Open **Users**. Use the tabs (All, Registered, Officers, Administrators) or the search box.
2. **Suspend** signs the account out immediately and stops it from logging in or posting.
   **Reinstate** reverses this.
3. For an officer, click **Jurisdictions** and choose the cities and municipalities they cover (at
   least one). Their queue changes immediately.

### Screen a nomination

1. Open **Destinations**. The **Pending screening** tab lists new nominations.
2. Open one and read its details and photos. **Automatic checks** lists any prohibited words, similar
   names in the same town, or matches on the already-promoted list.
3. Choose an action:
   - **Pass and route to officer** sends it to the officer(s) of that town, who are notified. Its
     photos are approved.
   - **Return to submitter** asks for changes. Write what to fix; the submitter sees your remarks and
     can resubmit.
   - **Reject** is final. Write the reason.

To take an endorsed destination off the site, for example after a report, open it and click
**Pull from public**, then write remarks.

### Moderate reviews and photos

New reviews and review photos wait in **Community Content**. Click the check mark to approve an item
(it becomes public) or the cross to remove it permanently. Removing a review also removes its photos.
The writer is notified either way.

### Handle reports

1. Open **Reports** and click a report to see the reported content.
2. **Mark under review** flags the content while you check it.
3. Close the report with one of these:
   - **Keep content and dismiss**: the content stays approved.
   - **Remove content and resolve**: the content is removed and the writer is notified.

For a report about a destination, use **Pull from public** on the destination page if needed, then
resolve the report.

### Edit the screening lists

In **Screening Lists**, add or remove prohibited words (English, Filipino, and Kapampangan) and
already-promoted places. Changes apply to the next submission.

Administrators are notified, in the app and by e-mail, when a new nomination is waiting.

---

## 5. Local Tourism Officers

Log in with an officer account (for example `lto.main@sulyap.site`) to open the **Officer portal**.
The label at the top right shows your jurisdictions ("All 22" for the main account).

| Menu item | Purpose |
| --- | --- |
| Submissions | Nominations routed to your jurisdictions |
| Reviewed | Your past decisions |
| Bell icon | Notifications of new routed nominations (also sent by e-mail) |

To change your password, click your avatar.

### Review a submission

1. Open a nomination from **Submissions**.
2. For each of the three criteria, write what you checked and click **Met** or **Not met**.
   Criterion 1 needs the Google Maps and TripAdvisor review counts (5 or fewer on each passes) and
   the date you checked them.
3. **Save as draft** keeps your work; the list then shows **Continue review**.
4. Decide:
   - **Endorse** is available only when all three criteria are Met. You can add a season tag.
   - **Return** or **Reject** requires remarks, which the submitter sees.

If another officer for the same town decides first, the submission leaves your list.

To test routing, log in as `lto.mabalacat@example.com`. This officer sees only Mabalacat City
nominations, while `lto.main` sees all of them.

---

## 6. Automatic processes

| Process | What happens |
| --- | --- |
| ID photos | Deleted 24 hours after the verification decision |
| E-mails | Sent for verification links, ID results, and every notification |
| Newsletter | Sent once a month for the previous month, by a scheduled job |
| Suspension | A suspended account is signed out immediately |
| Login sessions | Last 7 days, after which you log in again |
| Attempt limits | Too many login or sign-up attempts pause those actions for 15 minutes |

On your computer, the dev outbox has a **Send this month's newsletter** button for a test issue.

---

## 7. Troubleshooting

| Problem | Solution |
| --- | --- |
| The site cannot reach the server | Check that `npm run dev` is running. |
| sulyap-web.vercel.app shows "Could not load destinations" | Expected for now: the server is not online yet. Test on your computer. |
| "Database not configured", or nothing loads | Check `server/.env`. If Supabase paused the project after a week without use, open the Supabase dashboard and click **Restore**. |
| No verification e-mail on your computer | Open http://localhost:5173/dev/outbox. |
| "Too many attempts" | Wait 15 minutes. |
| You want fresh test data | Run `npm run db:clear:demo`, then `npm run db:seed:demo`. |
