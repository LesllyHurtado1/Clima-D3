
const tooltip = document.getElementById('tooltip');
function showTip(html, event) {
    tooltip.innerHTML = html;
    tooltip.style.opacity = 1;
    moveTip(event);
}
function moveTip(event) {
    tooltip.style.left = (event.clientX + 14) + 'px';
    tooltip.style.top  = (event.clientY - 10) + 'px';
}
function hideTip() { tooltip.style.opacity = 0; }

// Regresión lineal
function regression(xs, ys) {
    const n  = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    const slope = xs.reduce((sum, xi, i) => sum + (xi - mx) * (ys[i] - my), 0) /
                  xs.reduce((sum, xi) => sum + (xi - mx) ** 2, 0);
    const intercept = my - slope * mx;
    // R²
    const ssTot = ys.reduce((sum, yi) => sum + (yi - my) ** 2, 0);
    const ssRes = ys.reduce((sum, yi, i) => sum + (yi - (slope * xs[i] + intercept)) ** 2, 0);
    return { slope, intercept, r2: 1 - ssRes / ssTot };
}

// limpieza y csv
d3.csv("data/global_climate_energy_2020_2024.csv").then(raw => {

    raw.forEach(d => {
        d.date                      = new Date(d.date);
        d.avg_temperature           = +d.avg_temperature;
        d.co2_emission              = +d.co2_emission;
        d.energy_price              = +d.energy_price;
        d.energy_consumption        = +d.energy_consumption;
        d.renewable_share           = +d.renewable_share;
        d.industrial_activity_index = +d.industrial_activity_index;
        d.country                   = d.country?.trim();
    });

    const data = raw.filter(d =>
        d.date && d.country &&
        !isNaN(d.avg_temperature)           &&
        !isNaN(d.co2_emission)              &&
        !isNaN(d.energy_price)              &&
        !isNaN(d.energy_consumption)        &&
        !isNaN(d.renewable_share)           &&
        !isNaN(d.industrial_activity_index)
    ).sort((a, b) => a.date - b.date);

    const M = { top: 70, right: 30, bottom: 55, left: 65 };
    const W = 900 - M.left - M.right;   // ancho útil
    const H = 400 - M.top  - M.bottom;  // alto útil

    //  TEMPERATURA vs TIEMPO  

    (function chart1() {

    const svg = d3.select("#chart1");
    const M = { top: 100, right: 30, bottom: 55, left: 85 };
    const g = svg.append("g")
        .attr("transform", `translate(${M.left},${M.top})`);

    // Promedio mensual global

    const monthly = Array.from(
        d3.rollup(data, v => d3.mean(v, d => d.avg_temperature), d => d3.timeMonth(d.date)),
        ([date, value]) => ({ date, value })
    ).sort((a, b) => a.date - b.date);

    const x = d3.scaleTime()
        .domain(d3.extent(monthly, d => d.date))
        .range([0, W]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(monthly, d => d.value) - 1,
            d3.max(monthly, d => d.value) + 1
        ])
        .nice(6)
        .range([H, 0]);

    // ── Títulos ──
    svg.append("text")
        .attr("class", "chart-title-main")
        .attr("x", M.left)
        .attr("y", 28)
        .text("Variación de temperatura promedio (2020–2024)");

    svg.append("text")
        .attr("class", "chart-title-sub")
        .attr("x", M.left)
        .attr("y", 48)
        .text("Tendencia mensual global — promedio de todos los países");

    svg.append("text")
        .attr("x", M.left)
        .attr("y", 68)
        .style("font-size", "11px")
        .style("fill", "#555")
        .text(" ¿Cómo ha cambiado la temperatura a lo largo del tiempo?");

              // GRID Y (horizontal)
        g.append("g")
            .attr("class", "grid")
            .call(
                d3.axisLeft(y)
                    .ticks(7)
                    .tickSize(-W)
                    .tickFormat("")
            )
            .selectAll("line")
            .style("stroke", "#b1acac")
            .attr("stroke-dasharray", "4 4") 
            .attr("opacity", 0.6);

        // GRID X (vertical)
        g.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${H})`)
            .call(
                d3.axisBottom(x)
                    .ticks(7)
                    .tickSize(-H)
                    .tickFormat("")
            )
            .selectAll("line")
            .style("stroke", "#b1acac")
            .attr("stroke-dasharray", "4 4") 
            .attr("opacity", 0.6);

    // ÁREA 
   
    const area = d3.area()
        .x(d => x(d.date))
        .y0(H)
        .y1(d => y(d.value))
        .curve(d3.curveCatmullRom.alpha(0.5));

    g.append("path")
        .datum(monthly)
        .attr("fill", "#4e79a7")
        .attr("opacity", 0.12)
        .attr("d", area);

    //  LÍNEA  ─
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value))
        .curve(d3.curveCatmullRom.alpha(0.5));

    g.append("path")
        .datum(monthly)
        .attr("fill", "none")
        .attr("stroke", "#1f3b73")
        .attr("stroke-width", 2.8)
        .attr("stroke-linecap", "round")
        .attr("d", line);

    // ── PUNTOS (más sutiles) ──
    g.selectAll("circle")
        .data(monthly)
        .join("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.value))
        .attr("r", 2.5)
        .attr("fill", "#1f3b73")
        .attr("opacity", 0.85)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", (event, d) =>
            showTip(`<b>${d3.timeFormat("%B %Y")(d.date)}</b><br>Temp: ${d.value.toFixed(1)} °C`, event)
        )
        .on("mousemove", moveTip)
        .on("mouseout", hideTip);

    // EJE X 
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat("%b %Y")))
        .selectAll("text")
        .attr("transform", "rotate(0)")
        .style("text-anchor", "end")
        .attr("dy", "0.3em");

    //EJE Y 
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "°"));

    //  LABELS
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -H / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Temperatura ");

    g.append("text")
        .attr("class", "axis-label")
        .attr("x", W / 2)
        .attr("y", H + 42)
        .attr("text-anchor", "middle")
        .text("Tiempo");

   
    svg.append("text").attr("class", "chart-title-main")
                .attr("x", M.left).attr("y", 448)
                .text("Analisis");

         svg.append("text")
            .attr("x", M.left)
            .attr("y", 468)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("Esta gráfica muestra cómo cambia la temperatura promedio a lo largo del tiempo. Se puede observar un patrón muy claro y repetitivo, donde la temperatura sube y baja   ");

        svg.append("text")
            .attr("x", M.left)
            .attr("y", 488)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("de forma constante cada año.Los picos representan los momentos de mayor temperatura, mientras que los puntos más bajos corresponden a las épocas más frías. ");
            
        
         svg.append("text")
            .attr("x", M.left)
            .attr("y", 508)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("Este comportamiento se repite de manera similar en todos los años, lo que indica que hay una tendencia estacional bastante marcada ");

})();

     
    //  CO₂ POR PAÍS 
    
    (function chart2() {
        const svg = d3.select("#chart2");
        const M2 = { top: 110, right: 30, bottom: 55, left: 85 };

        const g = svg.append("g")
        .attr("transform", `translate(${M2.left},${M2.top})`);

        const co2 = Array.from(
            d3.rollup(data, v => d3.mean(v, d => d.co2_emission), d => d.country),
            ([country, val]) => ({ country, val })
        ).sort((a, b) => b.val - a.val);

        // Paleta secuencial azul: más oscuro = más emisiones
        const colorCo2 = d3.scaleSequential()
            .domain([d3.min(co2, d => d.val), d3.max(co2, d => d.val)])
            .interpolator(t => d3.interpolateBlues(0.25 + t * 0.65));

        const x = d3.scaleBand()
            .domain(co2.map(d => d.country))
            .range([0, W]).padding(0.28);

        const y = d3.scaleLinear()
            .domain([0, d3.max(co2, d => d.val) * 1.12])
            .nice().range([H, 0]);

        //Título 
        svg.append("text").attr("class", "chart-title-main")
            .attr("x", M.left).attr("y", 28)
            .text("Emisiones de CO₂ por país");

        svg.append("text").attr("class", "chart-title-sub")
            .attr("x", M.left).attr("y", 48)
            .text("Promedio diario de emisiones 2020–2024 — ordenado de mayor a menor");

        svg.append("text")
        .attr("x", M.left)
        .attr("y", 68)
        .style("font-size", "11px")
        .style("fill", "#555")
        .text("Pregunta: ¿Qué países contaminan más?");

        //  Grid 
        g.append("g").attr("class", "grid")
            .call(d3.axisLeft(y).ticks(5).tickSize(-W).tickFormat(""));

        // ── Barras ──
        g.selectAll("rect").data(co2).join("rect")
            .attr("x", d => x(d.country))
            .attr("y", d => y(d.val))
            .attr("width",  x.bandwidth())
            .attr("height", d => H - y(d.val))
            .attr("fill", d => colorCo2(d.val))
            .attr("rx", 3)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) =>
                showTip(`<b>${d.country}</b><br>CO₂ promedio: ${d.val.toFixed(1)} ton/día`, event))
            .on("mousemove", moveTip)
            .on("mouseout",  hideTip);

        // Etiquetas de valor 
        g.selectAll(".vlabel").data(co2).join("text")
            .attr("class", "vlabel")
            .attr("x", d => x(d.country) + x.bandwidth() / 2)
            .attr("y", d => y(d.val) - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "9px").style("fill", "#555").style("font-weight", "600")
            .text(d => d.val.toFixed(0));

        // ── Ejes ──
        g.append("g").attr("class", "axis")
            .attr("transform", `translate(0,${H})`)
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")
            .attr("transform", "rotate(-22)").style("text-anchor", "end")
            .attr("dx", "-0.4em").attr("dy", "0.2em").style("font-size", "10px");

        g.append("g").attr("class", "axis")
            .call(d3.axisLeft(y).ticks(5)
                .tickFormat(d => d >= 1000 ? (d / 1000).toFixed(0) + "k" : d));

        g.append("text").attr("class", "axis-label")
            .attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", -50)
            .attr("text-anchor", "middle").text("CO₂ promedio ");


        svg.append("text").attr("class", "chart-title-main")
            .attr("x", M.left).attr("y", 448)
            .text("Analisis");

         svg.append("text")
            .attr("x", M.left)
            .attr("y", 468)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("Las emisiones de CO₂ entre los países no son muy diferentes entre sí, ya que la mayoría se mantiene en un rango bastante parecido. Australia es el país con el valor más alto,");

        svg.append("text")
            .attr("x", M.left)
            .attr("y", 488)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text(" mientras que Turquía tiene el más bajo. Aunque hay un orden de mayor a menor,la diferencia entre los países no es muy grande,lo que indica que todos tienen niveles de  ");
            
        svg.append("text")
            .attr("x", M.left)
            .attr("y", 508)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text(" emisiones bastante similares dentro del conjunto de datos.");
        
    })();
    
    //  CONSUMO vs PRECIO  

    (function chart3() {
        const svg = d3.select("#chart3");
        const M3 = { top: 110, right: 30, bottom: 55, left: 85 };

        const g = svg.append("g")
        .attr("transform", `translate(${M3.left},${M3.top})`);
 
        // Calcular estadísticas por país 
        const countries = [...new Set(data.map(d => d.country))].sort();
 
        const stats = countries.map(country => {
            const vals = data
                .filter(d => d.country === country)
                .map(d => d.energy_consumption)
                .sort(d3.ascending);
 
            const q1  = d3.quantile(vals, 0.25);
            const med = d3.quantile(vals, 0.50);
            const q3  = d3.quantile(vals, 0.75);
            const iqr = q3 - q1;
            const whiskerLo = Math.max(d3.min(vals), q1 - 1.5 * iqr);
            const whiskerHi = Math.min(d3.max(vals), q3 + 1.5 * iqr);
            const outliers  = vals.filter(v => v < whiskerLo || v > whiskerHi);
 
            return { country, q1, med, q3, whiskerLo, whiskerHi, outliers };
        }).sort((a, b) => b.med - a.med); // orden por mediana descendente
 
        // ── Escalas 
        const x = d3.scaleBand()
            .domain(stats.map(d => d.country))
            .range([0, W]).padding(0.35);
 
        const allVals = data.map(d => d.energy_consumption);
        const y = d3.scaleLinear()
            .domain([0, d3.max(allVals) * 1.05])
            .nice().range([H, 0]);
 
        // Color por mediana (paleta secuencial azul)
        const colorBox = d3.scaleSequential()
            .domain([d3.min(stats, d => d.med), d3.max(stats, d => d.med)])
            .interpolator(t => d3.interpolateBlues(0.25 + t * 0.6));
 
        // ── Título ──
        svg.append("text").attr("class", "chart-title-main")
            .attr("x", M.left).attr("y", 28)
            .text("Distribución del consumo energético por país");
 
        svg.append("text").attr("class", "chart-title-sub")
            .attr("x", M.left).attr("y", 48)
            .text("Mediana, rango intercuartílico y valores extremos — ordenado por consumo mediano");
 

        svg.append("text")
        .attr("x", M.left)
        .attr("y", 68)
        .style("font-size", "11px")
        .style("fill", "#555")
        .text("¿Cómo varía el consumo energético entre países?"); 
        
         // GRID Y (horizontal)
        g.append("g")
            .attr("class", "grid")
            .call(
                d3.axisLeft(y)
                    .ticks(7)
                    .tickSize(-W)
                    .tickFormat("")
            )
            .selectAll("line")
            .style("stroke", "#b1acac")
            .attr("stroke-dasharray", "4 4") 
            .attr("opacity", 0.6);

        // GRID X (vertical)
        g.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${H})`)
            .call(
                d3.axisBottom(x)
                    .ticks(7)
                    .tickSize(-H)
                    .tickFormat("")
            )
            .selectAll("line")
            .style("stroke", "#b1acac")
            .attr("stroke-dasharray", "4 4") 
            .attr("opacity", 0.6);
            
        // ── Bigotes (whiskers) ──
        g.selectAll(".whisker-lo")
            .data(stats).join("line")
            .attr("class", "whisker-lo")
            .attr("x1", d => x(d.country) + x.bandwidth() / 2)
            .attr("x2", d => x(d.country) + x.bandwidth() / 2)
            .attr("y1", d => y(d.whiskerLo))
            .attr("y2", d => y(d.q1))
            .attr("stroke", "#bbb").attr("stroke-width", 1.2);
 
        g.selectAll(".whisker-hi")
            .data(stats).join("line")
            .attr("class", "whisker-hi")
            .attr("x1", d => x(d.country) + x.bandwidth() / 2)
            .attr("x2", d => x(d.country) + x.bandwidth() / 2)
            .attr("y1", d => y(d.q3))
            .attr("y2", d => y(d.whiskerHi))
            .attr("stroke", "#bbb").attr("stroke-width", 1.2);
 
        // Líneas de extremo del bigote
        g.selectAll(".cap-lo")
            .data(stats).join("line")
            .attr("x1", d => x(d.country) + x.bandwidth() * 0.25)
            .attr("x2", d => x(d.country) + x.bandwidth() * 0.75)
            .attr("y1", d => y(d.whiskerLo)).attr("y2", d => y(d.whiskerLo))
            .attr("stroke", "#bbb").attr("stroke-width", 1.2);
 
        g.selectAll(".cap-hi")
            .data(stats).join("line")
            .attr("x1", d => x(d.country) + x.bandwidth() * 0.25)
            .attr("x2", d => x(d.country) + x.bandwidth() * 0.75)
            .attr("y1", d => y(d.whiskerHi)).attr("y2", d => y(d.whiskerHi))
            .attr("stroke", "#bbb").attr("stroke-width", 1.2);
 
        // ── Cajas IQR ──
        g.selectAll(".box")
            .data(stats).join("rect")
            .attr("class", "box")
            .attr("x", d => x(d.country))
            .attr("y", d => y(d.q3))
            .attr("width", x.bandwidth())
            .attr("height", d => y(d.q1) - y(d.q3))
            .attr("fill", d => colorBox(d.med))
            .attr("stroke", d => d3.color(colorBox(d.med)).darker(0.5))
            .attr("stroke-width", 1)
            .attr("rx", 3)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) =>
                showTip(
                    `<b>${d.country}</b><br>` +
                    `Mediana: ${d.med.toFixed(0)} MWh<br>` +
                    `Q1: ${d.q1.toFixed(0)} · Q3: ${d.q3.toFixed(0)}<br>` +
                    `Rango: ${d.whiskerLo.toFixed(0)} – ${d.whiskerHi.toFixed(0)}`,
                    event))
            .on("mousemove", moveTip)
            .on("mouseout",  hideTip);
 
        //  Línea de mediana 
        g.selectAll(".median-line")
            .data(stats).join("line")
            .attr("class", "median-line")
            .attr("x1", d => x(d.country))
            .attr("x2", d => x(d.country) + x.bandwidth())
            .attr("y1", d => y(d.med)).attr("y2", d => y(d.med))
            .attr("stroke", "#fff").attr("stroke-width", 2);
 
        // Outliers 
        stats.forEach(s => {
            g.selectAll(`.out-${s.country.replace(/\s/g,"_")}`)
                .data(s.outliers).join("circle")
                .attr("cx", x(s.country) + x.bandwidth() / 2)
                .attr("cy", v => y(v))
                .attr("r", 2)
                .attr("fill", "none")
                .attr("stroke", d3.color(colorBox(s.med)).darker(0.4))
                .attr("stroke-width", 1)
                .attr("opacity", 0.6);
        });
 
        // Etiqueta de mediana 
        g.selectAll(".med-label")
        .data(stats).join("text")
        .attr("class", "med-label") // 👈 correcto
        .attr("x", d => x(d.country) + x.bandwidth() / 2)
        .attr("y", d => y(d.med) - 6)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#3a3939") // 👈 aquí cambias el color
        .style("font-weight", "700")
        .text(d => (d.med / 1000).toFixed(1) + "k");
 
        //Ejes
        g.append("g").attr("class", "axis")
            .attr("transform", `translate(0,${H})`)
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")
            .attr("transform", "rotate(-22)")
            .style("text-anchor", "end")
            .attr("dx", "-0.4em").attr("dy", "0.2em")
            .style("font-size", "10px");
 
        g.append("g").attr("class", "axis")
            .call(d3.axisLeft(y).ticks(5)
                .tickFormat(d => d >= 1000 ? (d / 1000).toFixed(0) + "k" : d));
 
        g.append("text").attr("class", "axis-label")
            .attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", -50)
            .attr("text-anchor", "middle").text("Consumo energético ");

    ;svg.append("text").attr("class", "chart-title-main")
            .attr("x", M.left).attr("y", 448)
            .text("Analisis");

         svg.append("text")
            .attr("x", M.left)
            .attr("y", 468)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("Esta gráfica muestra cómo se distribuye el consumo energético en diferentes países. Se puede ver que la mayoría tienen valores bastante parecidos, ya que las medianas ");

        svg.append("text")
            .attr("x", M.left)
            .attr("y", 488)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("están muy cercanas entre sí, alrededor de los 7k. Pero no todos se comportan igual. Algunos países tienen mayor variación en sus datos, lo que indica que su consumo ");
            
        svg.append("text")
            .attr("x", M.left)
            .attr("y", 508)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("cambia más con el tiempo, mientras que otros son más estables. Tambien algunos valores más altos o más bajos de lo normal, lo que puede deberse a cambios en la actividad ");
        
         svg.append("text")
            .attr("x", M.left)
            .attr("y", 528)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("industrial o en el uso de energía. ")
 
        
    })();
  
    //  ENERGÍA RENOVABLE  POR PAIS
   
    (function chart4() {

        const svg = d3.select("#chart4");

        const M = { top: 110, right: 30, bottom: 55, left: 85 };

        const g4 = svg.append("g")
        .attr("transform", `translate(${M.left},${M.top})`);

        //  DATOS 
        const renew = Array.from(
            d3.rollup(data, v => d3.mean(v, d => d.renewable_share), d => d.country),
            ([country, val]) => ({ country, val })
        )
            .sort((a, b) => b.val - a.val)
            .slice(0, 10) 

        // ALTURA DINÁMICA 
        const barSpacing = 28;
        const newHeight = renew.length * barSpacing;

        svg.attr("height", newHeight + M.top + M.bottom);

        const H_dynamic = newHeight;

        const g = svg.append("g")
            .attr("transform", `translate(${M.left},${M.top})`);

        // ESCALAS 
        const y = d3.scaleBand()
            .domain(renew.map(d => d.country))
            .range([0, H_dynamic])
            .padding(0.35);

        const x = d3.scaleLinear()
            .domain([0, d3.max(renew, d => d.val) * 1.15])
            .range([0, W]);

        //  BARRAS MÁS DELGADAS
        const barHeight = y.bandwidth() * 0.65;

        // ── TÍTULOS ──
        svg.append("text")
            .attr("class", "chart-title-main")
            .attr("x", M.left)
            .attr("y", 28)
            .text("Participación de energías renovables por país");

        svg.append("text")
            .attr("class", "chart-title-sub")
            .attr("x", M.left)
            .attr("y", 48)
            .text("Porcentaje promedio de energía renovable sobre el total (2020–2024)");
        
        svg.append("text")
        .attr("x", M.left)
        .attr("y", 68)
        .style("font-size", "11px")
        .style("fill", "#555")
        .text("¿Cuales son los 10 países que utilizan más energía renovable?"); 

        //GRID SUAVE 
        g.append("g")
            .attr("class", "grid")
            .call(
                d3.axisBottom(x)
                    .ticks(4)
                    .tickSize(H_dynamic)
                    .tickFormat("")
            )
            .selectAll("line")
            .attr("stroke", "#ddd")
            .attr("opacity", 0.4);

        // ── TRACK (fondo de barras) ──
        g.selectAll(".track")
            .data(renew)
            .join("rect")
            .attr("class", "track")
            .attr("x", 0)
            .attr("y", d => y(d.country) + (y.bandwidth() - barHeight) / 2)
            .attr("height", barHeight)
            .attr("width", x(d3.max(renew, d => d.val) * 1.15))
            .attr("fill", "#f2f2f2")
            .attr("rx", 4);

        // ── BARRAS PRINCIPALES ──
        g.selectAll(".bar")
            .data(renew)
            .join("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", d => y(d.country) + (y.bandwidth() - barHeight) / 2)
            .attr("height", barHeight)
            .attr("width", d => x(d.val))
            .attr("fill", "#2a9d8f")
            .attr("opacity", 0.9)
            .attr("rx", 4)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) =>
                showTip(`<b>${d.country}</b><br>Renovable: ${d.val.toFixed(1)}%`, event)
            )
            .on("mousemove", moveTip)
            .on("mouseout", hideTip);

        // ── LABELS DE VALOR ──
        g.selectAll(".rlabel")
            .data(renew)
            .join("text")
            .attr("class", "rlabel")
            .attr("x", d => x(d.val) + 6)
            .attr("y", d => y(d.country) + y.bandwidth() / 2 + 3)
            .style("font-size", "9.5px")
            .style("fill", "#444")
            .style("font-weight", "600")
            .text(d => d.val.toFixed(1) + "%");

        // ── EJE Y ──
        g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).tickSize(0))
            .selectAll("text")
            .attr("dx", "-4px")
            .style("font-size", "11px");

        // ── EJE X ──
        g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${H_dynamic})`)
            .call(d3.axisBottom(x).ticks(4).tickFormat(d => d + "%"));

        // ── LABEL X ──
        g.append("text")
            .attr("class", "axis-label")
            .attr("x", W / 2)
            .attr("y", H_dynamic + 42)
            .attr("text-anchor", "middle")
            .text("Participación renovable");

        svg.append("text").attr("class", "chart-title-main")
            .attr("x", M.left).attr("y", 448)
            .text("Analisis");

         svg.append("text")
            .attr("x", M.left)
            .attr("y", 468)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("La gráfica muestra los 10 países con mayor participación de energía renovable. Se observa que todos los países tienen valores muy cercanos entre sí, entre  ");

        svg.append("text")
            .attr("x", M.left)
            .attr("y", 488)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text(" aproximadamente el 15.9% y el 16.1%. Mostrando que, aunque estos países lideran el uso de energías renovables dentro del conjunto de datos, no hay una diferencia ");
            
        svg.append("text")
            .attr("x", M.left)
            .attr("y", 508)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text(" muy marcada entre ellos. ninguno sobresale de forma significativa, sino que todos mantienen niveles similares de uso. También se puede notar que países como México   ");
        
         svg.append("text")
            .attr("x", M.left)
            .attr("y", 528)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("y Reino Unido aparecen ligeramente por encima del resto, aunque la diferencia es mínima.  Mostrando que el avance en energías renovables es relativamente equilibrado  ")

            svg.append("text")
            .attr("x", M.left)
            .attr("y", 548)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text(" entre estos países. ")




    })();
    
    // RENOVABLE vs CO₂  

    (function chartRenewLine() {

        const svg = d3.select("#chart6");
        const M = { top: 110, right: 30, bottom: 55, left: 65 };

        const g = svg.append("g")
            .attr("transform", `translate(${M.left},${M.top})`);

        //  AGRUPACIÓN 
        const bins = d3.bin()
            .value(d => d.renewable_share)
            .thresholds(12)(data);

        const trend = bins.map(bin => ({
            x: d3.mean(bin, d => d.renewable_share),
            y: d3.mean(bin, d => d.co2_emission)
        })).filter(d => !isNaN(d.x) && !isNaN(d.y));

        //  ESCALAS 
         const x = d3.scaleLinear()
            .domain([5, 35]) // 👈 fijo
            .range([0, W]);

        const y = d3.scaleLinear()
            .domain([400, 460]) // 👈 fijo
            .range([H, 0]);

                // GRID Y (horizontal)
        g.append("g")
            .attr("class", "grid")
            .call(
                d3.axisLeft(y)
                    .ticks(7)
                    .tickSize(-W)
                    .tickFormat("")
            )
            .selectAll("line")
            .style("stroke", "#b1acac")
            .attr("stroke-dasharray", "4 4") 
            .attr("opacity", 0.6);

        // GRID X (vertical)
        g.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${H})`)
            .call(
                d3.axisBottom(x)
                    .ticks(7)
                    .tickSize(-H)
                    .tickFormat("")
            )
            .selectAll("line")
            .style("stroke", "#b1acac")
            .attr("stroke-dasharray", "4 4") 
            .attr("opacity", 0.6);

             // ── TÍTULOS ──
        svg.append("text")
            .attr("class", "chart-title-main")
            .attr("x", M.left)
            .attr("y", 28)
            .text("Relación entre energía renovable y emisiones de CO₂");

        svg.append("text")
            .attr("class", "chart-title-sub")
            .attr("x", M.left)
            .attr("y", 48)
            .text("Promedios agrupados — tendencia general");

        svg.append("text")
        .attr("x", M.left)
        .attr("y", 68)
        .style("font-size", "11px")
        .style("fill", "#555")
        .text("Pregunta : ¿Más energía renovable reduce las emisiones?"); 

        //  ÁREA SUAVE 
        const area = d3.area()
            .x(d => x(d.x))
            .y0(H)
            .y1(d => y(d.y))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(trend)
            .attr("fill", "#2a9d8f")
            .attr("opacity", 0.1)
            .attr("d", area);

        //  LÍNEA PRINCIPAL 
        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(trend)
            .attr("fill", "none")
            .attr("stroke", "#1b7f6b")
            .attr("stroke-width", 2.8)
            .attr("stroke-linecap", "round")
            .attr("d", line);

        // ── PUNTOS (más sutiles) ──
        g.selectAll("circle")
            .data(trend)
            .join("circle")
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
            .attr("r", 3)
            .attr("fill", "#1b7f6b")
            .attr("opacity", 0.85)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) =>
                showTip(`Renovable: ${d.x.toFixed(1)}%<br>CO₂: ${d.y.toFixed(2)}`, event)
            )
            .on("mousemove", moveTip)
            .on("mouseout", hideTip);

        // ── EJE X ──
        g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${H})`)
            .call(d3.axisBottom(x)
            .tickValues([5, 10, 15, 20, 25, 30, 35])
            .tickFormat(d => d + "%")
);

        // ── EJE Y ──
        g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).ticks(5));

        // ── LABELS ──
        g.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -H / 2)
            .attr("y", -50)
            .attr("text-anchor", "middle")
            .text("Emisiones de CO₂");

        g.append("text")
            .attr("class", "axis-label")
            .attr("x", W / 2)
            .attr("y", H + 42)
            .attr("text-anchor", "middle")
            .text("Energía renovable (%)");

         svg.append("text").attr("class", "chart-title-main")
            .attr("x", M.left).attr("y", 448)
            .text("Analisis");

         svg.append("text")
            .attr("x", M.left)
            .attr("y", 468)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("Esta gráfica muestra como las emisiones se mantienen relativamente estables a lo largo de los distintos niveles de energía renovable, sin cambios muy bruscos.  ");

        svg.append("text")
            .attr("x", M.left)
            .attr("y", 488)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("no se evidencia una disminución clara de las emisiones a medida que aumenta el uso de energías renovables. En algunos puntos incluso se presentan ligeros aumentos ");
            
        svg.append("text")
            .attr("x", M.left)
            .attr("y", 508)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("lo que nos dice que la relación no es completamente directa. Y en el final  de la grafica se observa una caída más marcada en las emisiones, lo que podría indicar  ");
        
         svg.append("text")
            .attr("x", M.left)
            .attr("y", 528)
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("un posible efecto positivo del aumento en el uso de energías renovables, aunque no es un patrón constante. ");

    })();

    (function chart5() {

    const svg = d3.select("#chart5");
    const M = { top: 110, right: 30, bottom: 55, left: 85 };

    const g = svg.append("g")
        .attr("transform", `translate(${M.left},${M.top})`);

    // ESCALAS
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.energy_consumption))
        .nice()
        .range([0, W]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.co2_emission))
        .nice()
        .range([H, 0]);

    // COLOR por país
    const color = d3.scaleOrdinal(d3.schemeTableau10);

    // PUNTOS
    g.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => x(d.energy_consumption))
        .attr("cy", d => y(d.co2_emission))
        .attr("r", 4)
        .attr("fill", d => color(d.country))
        .attr("opacity", 0.6)
        .on("mouseover", (event, d) =>
            showTip(`<b>${d.country}</b><br>Consumo: ${d.energy_consumption}<br>CO₂: ${d.co2_emission}`, event)
        )
        .on("mousemove", moveTip)
        .on("mouseout", hideTip);

    // 🔥 LÍNEA DE TENDENCIA (clave para insight)
    const xs = data.map(d => d.energy_consumption);
    const ys = data.map(d => d.co2_emission);
    const { slope, intercept } = regression(xs, ys);

    const line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y));

    const trendData = [
        { x: d3.min(xs), y: slope * d3.min(xs) + intercept },
        { x: d3.max(xs), y: slope * d3.max(xs) + intercept }
    ];

    g.append("path")
        .datum(trendData)
        .attr("fill", "none")
        .attr("stroke", "#e63946")
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "5 5")
        .attr("d", line);

    // EJES
    g.append("g")
        .attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .call(d3.axisLeft(y));

    // TÍTULOS
    svg.append("text")
        .attr("class", "chart-title-main")
        .attr("x", M.left)
        .attr("y", 28)
        .text("Relación entre consumo energético y emisiones de CO₂");

})();

}).catch(err => {
    console.error("Error cargando el dataset:", err);
    document.body.insertAdjacentHTML("beforeend",
        `<div style="color:#c0392b;padding:2rem;text-align:center;font-size:14px;">
            ⚠️ No se pudo cargar el CSV.<br>
            Verifica que el archivo esté en <code>data/global_climate_energy_2020_2024.csv</code>
            y que estés usando Live Server (no doble clic al HTML).
        </div>`
    );
});