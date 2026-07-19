# Team Randomizer

Simple static single-file web app to split players into two balanced teams based on groups and randomly select captains.

Usage
- Edit groups in `index.html` (or paste them into the Groups box).
- Click **Load players** to populate the attendee list.
- Select attending players and click **Generate teams**.

Groups format examples:
- `GroupA: Alice, Bob, Carol, Dave`
- `GroupB: Eve, Frank`
- or just a comma list for unnamed group: `Alice,Bob,Charlie`

Deployment
- Push this repo to GitHub and enable GitHub Pages from the `main` branch (or use the `gh-pages` branch). `index.html` will be served as the site root.

Notes
- If the total number of unique players is odd the app will pick one player as a common player (appears in both teams) so both teams have equal headcount.
- The app attempts to split each group equally between the two teams while randomizing assignment.
# TeamRandomizer
