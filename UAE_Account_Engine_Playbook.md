# UAE Account Engine Management

## Overview
This playbook manages the UAE Account Engine Google Sheet — maintaining account plan links, persona tabs, contact data, LinkedIn URLs, and the interactive Command Centre dashboard. It handles updates to the Master Ranked tab, persona-level data enrichment, and dashboard rebuilds.

## What's Needed From User
- Google account with edit access to the UAE Account Engine spreadsheet
- Google Drive folder URL containing account plan slides (if updating Account Plan links)
- CSV files for contact/messaging updates (if uploading new persona data)
- Tier assignments (if updating account tiering)

## Key Resources

**UAE Account Engine Sheet:**
- Spreadsheet ID: `1AjLi9qj0sh-ajoUmiEWrQ4aPhakEwe2S2RK4SptXNhg`
- URL: https://docs.google.com/spreadsheets/d/1AjLi9qj0sh-ajoUmiEWrQ4aPhakEwe2S2RK4SptXNhg/edit
- Master Ranked tab gid: `1926154775`

**Account Plans Drive Folder:**
- URL: https://drive.google.com/drive/folders/1B5kPntHwQeuIAVdbDu15rR7Yow7-cPUQ
- Contains native Google Slides presentations for each of 30 accounts

**Sheet Structure:**
- Column A: Rank
- Column B: Tier
- Column C: Company
- Column D: Account Plan (HYPERLINK to Google Slides)
- Column E: Notion Brief (HYPERLINK to Notion documents)
- Column F: Key Personas (HYPERLINK with `#gid=XXXX` to persona tab)

**Brand Guidelines:**
- Colors: Dark charcoal #1A1F2E, Teal accent #4ECDC4, White text
- Font: Inter Tight (Google Fonts)
- Footer: "✦ Cognition" left, "PROPRIETARY AND CONFIDENTIAL" center

<phase name="Data Extraction & Verification" id="1">
## Data Extraction & Verification

1. Connect to Chrome via Playwright CDP (`ss -tlnp | grep chrome` to find port)
2. Navigate to the UAE Account Engine sheet
3. Export current data using the gviz CSV endpoint:
   ```
   https://docs.google.com/spreadsheets/d/1AjLi9qj0sh-ajoUmiEWrQ4aPhakEwe2S2RK4SptXNhg/gviz/tq?tqx=out:csv&gid={gid}&range={range}
   ```
4. Verify the current state of whichever column/data needs updating
5. Show the user what currently exists before making any changes
6. Get explicit confirmation from the user before writing anything

<verification>
- Current sheet data has been exported and reviewed
- User has been shown the current state
- User has confirmed what changes should be made
- No data has been modified yet
</verification>
</phase>

<phase name="Sheet Updates" id="2">
## Sheet Updates

### Updating Account Plan Links (Column D)
1. Find the correct Google Slides URLs from the Drive folder
2. Navigate to Master Ranked tab (gid=1926154775)
3. Use Ctrl+J to focus the Name Box, type cell address (e.g., `D2`), press Enter
4. Press Delete to clear the cell
5. Type the HYPERLINK formula: `=HYPERLINK("https://docs.google.com/presentation/d/{id}/edit","Open Brief")`
6. Press Enter to confirm
7. Repeat for each account

### Updating Key Personas Links (Column F)
1. Click on the target persona tab (e.g., P: Tabby) to get its gid from the URL
2. Navigate back to Master Ranked
3. Edit the cell with: `=HYPERLINK("#gid={correct_gid}","View X Personas")`

### Adding LinkedIn URLs to Persona Tabs
1. Export persona tab data using gviz endpoint with `sheet=P%3A+{AccountName}`
2. Extract LinkedIn URLs from HYPERLINK formulas in the Name column
3. Navigate to the persona tab
4. Add "LinkedIn URL" column header
5. Paste extracted URLs into the new column

### Uploading Contact Data (CSV)
1. Read the provided CSV file
2. Navigate to the target persona tab
3. Clear existing data (only if instructed)
4. Paste new data maintaining the column structure
5. Apply formatting (row colors by category, conditional formatting for Connected?)

<verification>
- All target cells have been updated with correct formulas
- HYPERLINK formulas display correct link text
- Links open to the correct destinations when clicked
- No unrelated data was modified or deleted
- Changes verified via gviz CSV export
</verification>
</phase>

<phase name="Command Centre Dashboard" id="3">
## Command Centre Dashboard Rebuild

When the Command Centre needs updating (new accounts, tier changes, contact changes):

1. Export all persona tab data:
   - For each P: tab, export columns: Name, Category, Title, Connected?, LinkedIn URL
   - Use gviz endpoint: `sheet=P%3A+{name}&range=A:K`
   
2. Export Master Ranked for tier/rank assignments:
   - `gid=1926154775&range=A:F`

3. Build the HTML dashboard with:
   - All contacts grouped by account
   - Tier badges (Tier 1=gold, Tier 2=silver, Tier 3=bronze)
   - Status filter (Not Contacted / Messaged / Connected)
   - Persona level filter (C-Suite, VP & SVP, Director+, Specialists)
   - Search bar
   - Sort options (tier, alphabetical, most contacts, needs action, least progress)
   - Progress bars showing engagement %
   - Clickable contact names linking to LinkedIn
   - "Open Brief" button linking to Account Plan slides
   - Company logos (Clearbit API: `https://logo.clearbit.com/{domain}`)
   - Inter Tight font from Google Fonts CDN
   - Fully self-contained (no external JS dependencies beyond font)

4. Save as `UAE_Command_Centre_Cognition.html`
5. Share with user as attachment

<verification>
- HTML file opens correctly in Chrome
- All accounts are present with correct tier assignments
- Contact counts match the sheet data
- LinkedIn links work (open correct profiles)
- Open Brief links point to correct Google Slides
- Filters, search, and sort all function correctly
- File is fully self-contained (works offline except for font CDN)
</verification>
</phase>

<phase name="LinkedIn URL Enrichment" id="4">
## LinkedIn URL Enrichment (When Requested)

1. Export all persona tabs and identify contacts with blank LinkedIn URL cells
2. For each blank contact, search using Exa MCP:
   - Query: `"{Full Name}" "{Company}" site:linkedin.com/in`
   - Use `category:people` for LinkedIn people searches
3. Verify each result:
   - Name matches (first + last name)
   - Company/organization matches
   - Title is relevant
4. Write verified URLs back to the LinkedIn URL column
5. Delete any URLs that don't match the correct person
6. Report results: X found, X not found, X removed (wrong person)

<verification>
- All blank LinkedIn URLs have been searched
- Each found URL has been verified against name + company
- Incorrect matches have been removed
- Results reported to user with counts
</verification>
</phase>

## Specifications
- Never modify data without explicit user confirmation
- Always show current state before making changes
- HYPERLINK formulas use format: `=HYPERLINK("url","Display Text")`
- Key Personas links use internal anchors: `=HYPERLINK("#gid=XXXX","View N Personas")`
- Command Centre must be a single self-contained HTML file
- All contact names in Command Centre must link to LinkedIn where URL exists
- Use Inter Tight font for all branded outputs

## Advice and Pointers
- The gviz CSV export endpoint works without API keys for sheets shared with "anyone with the link"
- When editing cells via Playwright, use Ctrl+J to navigate to specific cells by address
- Press Delete before typing a new formula to clear existing content
- Tab gids can be found by clicking on the tab and reading the URL parameter
- Some persona tabs have slightly different names than the company (e.g., "P: Lean Tech" not "P: Lean Technologies")
- The Google Sheets export endpoint (`/export?format=csv&gid=X`) returns 400 for non-existent gids
- Chrome CDP port changes on restart — always check with `ss -tlnp | grep chrome`

## Forbidden Actions
- Do NOT delete any data from the sheet unless explicitly instructed
- Do NOT touch the P: FAB tab unless explicitly asked
- Do NOT put anything in the Notion Brief column except actual Notion document URLs
- Do NOT put Google Slides URLs or Sheet links in the Notion Brief column
- Do NOT deploy the Command Centre to public hosting (contains internal contact data)
- Do NOT guess or assume Slides URLs — always verify by opening them
- Do NOT write to the sheet without user confirmation
- Do NOT use `git add .` or commit sensitive data
