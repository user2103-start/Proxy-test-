// Vercel serverless function: api/proxy.js
// /api/proxy                      -> download page
// /api/proxy?pdf_id=..&course_id=..&parent_id=..&name=..  -> PDF download
const { Readable } = require("stream");

const API = "https://vibrant-live-api.lovable.app/api/v1/vibrant/pdf";
const REFERER = "https://pdfweb.classx.co.in/";

const PAGE = `<!DOCTYPE html><html lang="hi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>PDF Downloader</title>
<style>body{font:16px system-ui;max-width:420px;margin:40px auto;padding:0 16px}
input,button{width:100%;padding:10px;margin:6px 0;font:inherit;box-sizing:border-box}
button{background:#2455e6;color:#fff;border:0;border-radius:8px;font-weight:600}</style></head><body>
<h2>PDF download</h2>
<input id=p placeholder=pdf_id value=3760>
<input id=c placeholder=course_id value=8>
<input id=a placeholder=parent_id value=3749>
<input id=n placeholder="file naam" value=notes>
<button onclick="location='/api/proxy?pdf_id='+p.value+'&course_id='+c.value+'&parent_id='+a.value+'&name='+encodeURIComponent(n.value)">Download PDF</button>
</body></html>`;

module.exports = async (req, res) => {
  const u = new URL(req.url, "http://x");
  const q = u.searchParams;

  if (!q.get("pdf_id")) {
    res.setHeader("content-type", "text/html; charset=utf-8");
    return res.status(200).send(PAGE);
  }

  const fail = (code, msg) => res.status(code).setHeader("content-type", "text/plain; charset=utf-8").send(msg);
  try {
    const params = new URLSearchParams({
      pdf_id: q.get("pdf_id"),
      course_id: q.get("course_id") || "",
      parent_id: q.get("parent_id") || "",
    });
    const name = (q.get("name") || "notes").replace(/[^\w\- ]/g, "") + ".pdf";

    const txt = await (await fetch(API + "?" + params)).text();
    const found = (txt.match(/https?:\/\/[^\s"'\\]+/) || [])[0];
    if (!found) return fail(502, "PDF link nahi mila. API ne ye diya:\n" + txt.slice(0, 200));
    const pdfUrl = new URL(found).searchParams.get("file") || found;

    const r = await fetch(pdfUrl, { headers: { Referer: REFERER } });
    if (!r.ok) return fail(502, "PDF server ne " + r.status + " diya");

    res.statusCode = 200;
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="${name}"`);
    Readable.fromWeb(r.body).pipe(res);
  } catch (e) {
    fail(500, "Error: " + e.message);
  }
};
