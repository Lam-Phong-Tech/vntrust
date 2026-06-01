const fs = require('fs');
let c = fs.readFileSync('d:\\Web hang gia\\vntrust\\src\\app\\supply-chain\\page.tsx', 'utf8');

c = c.replace(/onChange=\{\(e\) => \{\s+setTimeRange\(e.target.value\);\s+\}\}/g, 
`onChange={(e) => {
                  setTimeRange(e.target.value);
                  setChartPeriod("1");
                }}`);

c = c.replace(/<button onClick=\{\(\) => setChartPeriod\("7"\)\}[^>]+>\{t\("sc_week"\)\}<\/button>/g, 
`{timeRange !== "7" && (
                    <button onClick={() => setChartPeriod("7")} className={\`cursor-pointer z-20 relative \${chartPeriod === "7" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors\`}>{t("sc_week")}</button>
                  )}`);

c = c.replace(/<button onClick=\{\(\) => setChartPeriod\("30"\)\}[^>]+>\{t\("sc_month"\)\}<\/button>/g, 
`{timeRange === "90" && (
                    <button onClick={() => setChartPeriod("30")} className={\`cursor-pointer z-20 relative \${chartPeriod === "30" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors\`}>{t("sc_month")}</button>
                  )}`);

fs.writeFileSync('d:\\Web hang gia\\vntrust\\src\\app\\supply-chain\\page.tsx', c);
