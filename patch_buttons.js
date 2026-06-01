const fs = require('fs');
let c = fs.readFileSync('d:\\Web hang gia\\vntrust\\src\\app\\supply-chain\\page.tsx', 'utf8');

c = c.replace('const [chartPoints, setChartPoints] = useState<number[]>([160, 130, 140, 110, 170, 90, 120, 60, 100, 30, 60]);', 
`const [chartPoints, setChartPoints] = useState<number[]>([180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 180]);
  const [chartPeriod, setChartPeriod] = useState<"1" | "7" | "30">("1");`);

c = c.replace('const res = await fetch(`/api/stats?days=${timeRange}`);', 'const res = await fetch(`/api/stats?days=${timeRange}&chartPeriod=${chartPeriod}`);');

c = c.replace('setTodayAuths(data.todayAuths);', 
`setTodayAuths(data.todayAuths);
        if (data.chartData && data.chartData.length > 0) {
          const counts = data.chartData;
          const maxCount = Math.max(...counts, 5);
          const minCount = 0;
          const scaledPts = counts.map((c: number) => {
            const ratio = (c - minCount) / (maxCount - minCount);
            return 180 - (ratio * 160);
          });
          setChartPoints(scaledPts);
        }`);

c = c.replace('}, [timeRange]);', '}, [timeRange, chartPeriod]);');

// Replace buttons
c = c.replace(
  '<button className="transparent-container px-4 py-2 rounded-lg text-xs font-bold text-primary">{t("sc_day")}</button>',
  '<button onClick={() => setChartPeriod("1")} className={`cursor-pointer z-20 relative ${chartPeriod === "1" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors`}>{t("sc_day")}</button>'
);
c = c.replace(
  '<button className="hover:transparent-container px-4 py-2 rounded-lg text-xs font-bold text-secondary transition-colors">{t("sc_week")}</button>',
  '<button onClick={() => setChartPeriod("7")} className={`cursor-pointer z-20 relative ${chartPeriod === "7" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors`}>{t("sc_week")}</button>'
);
c = c.replace(
  '<button className="hover:transparent-container px-4 py-2 rounded-lg text-xs font-bold text-secondary transition-colors">{t("sc_month")}</button>',
  '<button onClick={() => setChartPeriod("30")} className={`cursor-pointer z-20 relative ${chartPeriod === "30" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors`}>{t("sc_month")}</button>'
);

// Remove Math.random() update for chartPoints
c = c.replace(`setChartPoints(prev => {
        const newPts = [...prev.slice(1)];
        // Add random fluctuation to the last point, keep it within SVG viewbox 20 to 180
        const newY = Math.max(20, Math.min(180, prev[prev.length - 1] + (Math.random() * 80 - 40)));
        newPts.push(newY);
        return newPts;
      });`, '// Chart points are now updated from real API data');

fs.writeFileSync('d:\\Web hang gia\\vntrust\\src\\app\\supply-chain\\page.tsx', c);
