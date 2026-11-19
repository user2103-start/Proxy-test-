// Vercel function: api/proxy.js
// /api/proxy -> page | /api/proxy?pdf_id=..&course_id=..&parent_id=..&name=.. -> PDF | add &debug=1 for details
const { Readable } = require("stream");

const FRONT = "https://temp-vibe.egomale82.workers.dev/api/vibe/proxy?url="; // jo pehle chal raha tha
const API = "https://vibrant-live-api.lovable.app/api/v1/vibrant/pdf";
const REFERER = "https://pdfweb.classx.co.in/";
const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

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
  const q = new URL(req.url, "http://x").searchParams;
  const send = (code, type, body) => { res.statusCode = code; res.setHeader("content-type", type); res.end(body); };

  if (!q.get("pdf_id")) return send(200, "text/html; charset=utf-8", PAGE);

  try {
    const params = new URLSearchParams({
      pdf_id: q.get("pdf_id"),
      course_id: q.get("course_id") || "",
      parent_id: q.get("parent_id") || "",
    });
    const name = (q.get("name") || "notes").replace(/[^\w\- ]/g, "") + ".pdf";

    const txt = (await (await fetch(FRONT + encodeURIComponent(API + "?" + params))).text()).trim();
    const found = (txt.match(/https?:\/\/[^\s"'<>]+/) || [])[0];
    if (!found) return send(502, "text/plain; charset=utf-8", "PDF link nahi mila. API ne ye diya:\n" + txt.slice(0, 300));
    const pdfUrl = new URL(found).searchParams.get("file") || found;

    const r = await fetch(pdfUrl, { headers: { Referer: REFERER, Origin: "https://pdfweb.classx.co.in", "User-Agent": UA, Accept: "application/pdf,*/*" } });

    if (!r.ok || q.get("debug")) {
      const body = (await r.text()).slice(0, 200);
      return send(r.ok ? 200 : 502, "text/plain; charset=utf-8",
        `PDF server status: ${r.status}\nBody: ${body}\n\nAPI response:\n${txt.slice(0, 400)}\n\nFinal URL:\n${pdfUrl}`);
    }

    res.statusCode = 200;
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="${name}"`);
    Readable.fromWeb(r.body).pipe(res);
  } catch (e) {
    send(500, "text/plain; charset=utf-8", "Error: " + e.message);
  }
};
