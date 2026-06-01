const fs = require('fs');
let c = fs.readFileSync('d:\\Web hang gia\\vntrust\\src\\app\\supply-chain\\page.tsx', 'utf8');

const oldSelect = `                onChange={(e) => {
                  setTimeRange(e.target.value);
                }}`;
const newSelect = `                onChange={(e) => {
                  setTimeRange(e.target.value);
                  setChartPeriod("1");
                }}`;

const oldButtons = `<button onClick={() => setChartPeriod("7")} className={\`cursor-pointer z-20 relative \${chartPeriod === "7" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors\`}>{t("sc_week")}</button>
                  <button onClick={() => setChartPeriod("30")} className={\`cursor-pointer z-20 relative \${chartPeriod === "30" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors\`}>{t("sc_month")}</button>`;

const newButtons = `{timeRange !== "7" && (
                    <button onClick={() => setChartPeriod("7")} className={\`cursor-pointer z-20 relative \${chartPeriod === "7" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors\`}>{t("sc_week")}</button>
                  )}
                  {timeRange === "90" && (
                    <button onClick={() => setChartPeriod("30")} className={\`cursor-pointer z-20 relative \${chartPeriod === "30" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors\`}>{t("sc_month")}</button>
                  )}`;

c = c.replace(oldSelect, newSelect);
c = c.replace(oldButtons, newButtons);

fs.writeFileSync('d:\\Web hang gia\\vntrust\\src\\app\\supply-chain\\page.tsx', c);
