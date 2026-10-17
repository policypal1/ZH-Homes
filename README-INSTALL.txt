ZH Homes targeted update. GitHub was NOT modified.

Copy quote.html, 404.html, llms.txt and sitemap.xml into the repository root, replacing same-named files.
Copy api/bathroom-lead.js into the existing api folder, replacing the file there.
Do not replace style.css: this update does not change it.

Before deployment, back up the existing files. After deployment, submit one TEST quote, verify lead delivery in the destination and confirm the Google Ads conversion in Tag Assistant. Review Vercel logs for upstream timing. A slow Apps Script endpoint can still take time: this update improves feedback and adds a 25-second upstream timeout; it does not guarantee immediate delivery.

No other site assets are included because their existing names and contents are unchanged.
