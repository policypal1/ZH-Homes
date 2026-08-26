"use strict";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxNcL_ubhB_C2lWr0UJ086kj5XzhmTu_i_umh3Y6BBLrwceEW8qkyERc0H_qc1A0CXlyA/exec";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const payload =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }

    const appsScriptResponse = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    const responseText = (await appsScriptResponse.text()).trim();
    const normalizedResponse = responseText.toLowerCase();

    const appsScriptConfirmed =
      normalizedResponse === "ok" ||
      normalizedResponse === '{"ok":true}' ||
      normalizedResponse.includes('"ok":true');

    if (!appsScriptResponse.ok || !appsScriptConfirmed) {
      console.error("Apps Script lead submission failed", {
        status: appsScriptResponse.status,
        response: responseText.slice(0, 200)
      });

      return res.status(502).json({
        ok: false,
        error: "lead_delivery_failed"
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Bathroom lead API error:", error);
    return res.status(500).json({
      ok: false,
      error: "lead_delivery_failed"
    });
  }
};
