const supertest = require("supertest");

describe("Demo: Pretty Console Log", () => {
  const mockRequests = [
    { url: "https://www.douyin.com/video/7594434780347813155", method: "GET", status: 200 },
    { url: "https://www.douyin.com/video/7594434780347813155", method: "GET", status: 304 },
    { url: "https://lf3-short.ibytedapm.com/slardar/fe/sdk-web/browser.cn.js?bid=douyin_web&globalName=Slardar", method: "GET", status: 200 },
    { url: "https://api.example.com/data?param1=value1&param2=value2&param3=value3", method: "POST", status: 201 },
    { url: "https://cdn.example.com/assets/style.css", method: "GET", status: 200 },
  ];

  test("Pretty print request list", () => {
    const lines = [
      "┌─────────────────────────────────────────────────────────────────────────────┐",
      "│ 📋 Request List (Top 20)                                                    │",
      "├─────┬───────┬────────┬──────────────────────────────────────────────────────┤",
      "│ No. │ Method│ Status │ URL                                                  │",
      "├─────┼───────┼────────┼──────────────────────────────────────────────────────┤"
    ];
    
    mockRequests.slice(0, 20).forEach((req, idx) => {
      const num = String(idx + 1).padStart(3);
      const method = req.method.padEnd(6);
      const status = String(req.status).padStart(3);
      const url = req.url.length > 54 ? req.url.substring(0, 51) + "..." : req.url.padEnd(54);
      lines.push(`│ ${num} │ ${method}│  ${status}  │ ${url} │`);
    });
    
    lines.push("└─────┴───────┴────────┴──────────────────────────────────────────────────────┘");
    console.log(lines.join("\n"));
  });

  test("Compact pretty print", () => {
    const lines = ["🌐 Requests:"];
    mockRequests.slice(0, 20).forEach((req, idx) => {
      lines.push(`  ${(idx + 1).toString().padStart(2)}. [${req.method}] ${req.status} - ${req.url}`);
    });
    console.log(lines.join("\n"));
  });

  test("Grouped by domain", () => {
    const grouped = mockRequests.reduce((acc, req) => {
      const domain = new URL(req.url).hostname;
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(req);
      return acc;
    }, {});

    const lines = ["📊 Requests grouped by domain:", ""];
    Object.entries(grouped).forEach(([domain, reqs]) => {
      lines.push(`  🔹 ${domain} (${reqs.length} requests)`);
      reqs.forEach((req, idx) => {
        const path = new URL(req.url).pathname + new URL(req.url).search;
        lines.push(`     ${idx + 1}. [${req.method}] ${req.status} - ${path.substring(0, 60)}`);
      });
      lines.push("");
    });
    console.log(lines.join("\n"));
  });
});
