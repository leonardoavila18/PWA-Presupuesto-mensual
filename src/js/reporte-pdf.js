window.addEventListener(
  "online",
  () => (document.getElementById("status-online").style.background = "#27ae60"),
);
window.addEventListener(
  "offline",
  () => (document.getElementById("status-online").style.background = "#e74c3c"),
);

const CATEGORIAS = [
  { key: "comida", label: "Comida", color: "#f1c40f" },
  { key: "ropa", label: "Ropa", color: "#1abc9c" },
  { key: "transporte", label: "Transporte", color: "#e67e22" },
  { key: "entretenimiento", label: "Entretenimiento", color: "#2ecc71" },
  { key: "ocio", label: "Ocio", color: "#9b59b6" },
  { key: "salud", label: "Salud", color: "#e74c3c" },
  { key: "educación", label: "Educación", color: "#95a5a6" },
  { key: "servicios", label: "Servicios", color: "#34495e" },
  { key: "otros", label: "Otros", color: "#7f8c8d" },
];

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function fmt(v) {
  return (
    "$" +
    v.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const hoyDate = new Date();
let currentYear = hoyDate.getFullYear();
let currentMonth = hoyDate.getMonth();
let miGrafico = null;

const todosGastos = JSON.parse(localStorage.getItem("gastos")) || [];
const presupuesto = parseFloat(localStorage.getItem("presupuestoDiario")) || 0;

function updateMonthLabel() {
  document.getElementById("month-label").textContent =
    `${MESES[currentMonth]} ${currentYear}`;
  const isCurrentOrFuture =
    currentYear > hoyDate.getFullYear() ||
    (currentYear === hoyDate.getFullYear() &&
      currentMonth >= hoyDate.getMonth());
  document.getElementById("btn-next").disabled = isCurrentOrFuture;
}

document.getElementById("btn-prev").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  updateMonthLabel();
  document.getElementById("preview-area").classList.remove("visible");
});

document.getElementById("btn-next").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  updateMonthLabel();
  document.getElementById("preview-area").classList.remove("visible");
});

document
  .getElementById("btn-generate")
  .addEventListener("click", generatePreview);

function generatePreview() {
  const gastosMes = todosGastos.filter((g) => {
    const d = new Date(g.date + "T00:00:00");
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const totalGastado = gastosMes.reduce((s, g) => s + g.monto, 0);
  const disponible = presupuesto - totalGastado;
  const pct =
    presupuesto > 0 ? Math.min((totalGastado / presupuesto) * 100, 100) : 0;

  document.getElementById("preview-title").textContent =
    `Resumen — ${MESES[currentMonth]} ${currentYear}`;
  document.getElementById("prev-budget").textContent = fmt(presupuesto);
  document.getElementById("prev-spent").textContent = fmt(totalGastado);
  document.getElementById("prev-available").textContent = fmt(
    disponible >= 0 ? disponible : 0,
  );
  document.getElementById("prev-pct").textContent = pct.toFixed(1) + "%";

  const fill = document.getElementById("progress-fill-preview");
  fill.style.width = pct + "%";
  fill.classList.toggle("danger", pct >= 90);

  const totales = {};
  gastosMes.forEach((g) => {
    totales[g.categoria] = (totales[g.categoria] || 0) + g.monto;
  });
  const conGasto = CATEGORIAS.filter((c) => totales[c.key] > 0);

  const tbody = document.getElementById("cat-body");
  tbody.innerHTML = "";

  if (gastosMes.length === 0) {
    document.getElementById("table-empty").style.display = "block";
    document.getElementById("cat-table").style.display = "none";
  } else {
    document.getElementById("table-empty").style.display = "none";
    document.getElementById("cat-table").style.display = "table";

    const gastosOrdenados = [...gastosMes].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    gastosOrdenados.forEach((g) => {
      const cat = CATEGORIAS.find((c) => c.key === g.categoria) || {
        label: g.categoria,
        color: "#999",
      };
      const [y, m, d] = g.date.split("-");
      const fechaLegible = `${parseInt(d)}/${parseInt(m)}/${y}`;
      const tr = document.createElement("tr");
      tr.dataset.fecha = g.date;
      tr.dataset.categoria = cat.label;
      tr.dataset.monto = g.monto;
      tr.dataset.color = cat.color;
      tr.innerHTML = `
                <td>${fechaLegible}</td>
                <td><span class="category-dot" style="background:${cat.color}"></span>${cat.label}</td>
                <td>${fmt(g.monto)}</td>`;
      tbody.appendChild(tr);
    });
    document.getElementById("cat-total").textContent = fmt(totalGastado);
  }

  // Gráfico
  if (miGrafico) {
    miGrafico.destroy();
    miGrafico = null;
  }
  const ctx = document.getElementById("monthlyChart").getContext("2d");
  if (conGasto.length > 0) {
    miGrafico = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: conGasto.map((c) => c.label),
        datasets: [
          {
            data: conGasto.map((c) => totales[c.key]),
            backgroundColor: conGasto.map((c) => c.color),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        animation: { duration: 600 },
        plugins: {
          legend: {
            position: "bottom",
            labels: { padding: 16, font: { size: 13 } },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const val = ctx.parsed;
                const p =
                  totalGastado > 0
                    ? ((val / totalGastado) * 100).toFixed(1)
                    : 0;
                return `${ctx.label}: ${fmt(val)} (${p}%)`;
              },
            },
          },
        },
      },
    });
  }

  document.getElementById("preview-area").classList.add("visible");
}

document.getElementById("btn-export").addEventListener("click", async () => {
  const spinner = document.getElementById("spinner");
  const btn = document.getElementById("btn-export");
  spinner.classList.add("active");
  btn.disabled = true;

  await new Promise((r) => setTimeout(r, 300));

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  pdf.setFillColor(46, 204, 113);
  pdf.rect(0, 0, pageW, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont(undefined, "bold");
  pdf.text("FinanzApp — Reporte Mensual", pageW / 2, 17, { align: "center" });
  y = 36;

  pdf.setTextColor(44, 62, 80);
  pdf.setFontSize(13);
  pdf.setFont(undefined, "bold");
  pdf.text(`${MESES[currentMonth]} ${currentYear}`, pageW / 2, y, {
    align: "center",
  });
  y += 10;

  const boxW = (pageW - margin * 2 - 6) / 2;
  const boxH = 20;
  const boxes = [
    {
      label: "Presupuesto",
      value: document.getElementById("prev-budget").textContent,
      color: [46, 204, 113],
    },
    {
      label: "Total Gastado",
      value: document.getElementById("prev-spent").textContent,
      color: [231, 76, 60],
    },
    {
      label: "Disponible",
      value: document.getElementById("prev-available").textContent,
      color: [52, 152, 219],
    },
    {
      label: "% Utilizado",
      value: document.getElementById("prev-pct").textContent,
      color: [155, 89, 182],
    },
  ];
  boxes.forEach((b, i) => {
    const bx = margin + (i % 2) * (boxW + 6);
    const by = y + Math.floor(i / 2) * (boxH + 4);
    pdf.setFillColor(...b.color);
    pdf.roundedRect(bx, by, boxW, boxH, 3, 3, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(10);
    pdf.text(b.label, bx + boxW / 2, by + 7, { align: "center" });
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(12);
    pdf.text(b.value, bx + boxW / 2, by + 15, { align: "center" });
  });
  y += boxH * 2 + 12;

  const pct = parseFloat(document.getElementById("prev-pct").textContent) / 100;
  pdf.setFillColor(238, 238, 238);
  pdf.roundedRect(margin, y, pageW - margin * 2, 6, 3, 3, "F");
  pdf.setFillColor(...(pct >= 0.9 ? [231, 76, 60] : [46, 204, 113]));
  pdf.roundedRect(
    margin,
    y,
    (pageW - margin * 2) * Math.min(pct, 1),
    6,
    3,
    3,
    "F",
  );
  y += 14;

  // Grafico
  const chartCanvas = document.getElementById("monthlyChart");
  if (miGrafico) {
    const imgData = chartCanvas.toDataURL("image/png");
    const imgW = pageW - margin * 2;
    const imgH = imgW * 0.75;
    if (y + imgH + 10 > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.setTextColor(44, 62, 80);
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(12);
    pdf.text("Distribución por Categoría", margin, y);
    y += 6;
    pdf.addImage(imgData, "PNG", margin, y, imgW, imgH);
    y += imgH + 10;
  }

  const filas = document.querySelectorAll("#cat-body tr");
  if (filas.length > 0) {
    if (y + 10 > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(44, 62, 80);
    pdf.text("Detalle de Gastos", margin, y);
    y += 7;

    // Cabecera
    pdf.setFillColor(46, 204, 113);
    pdf.rect(margin, y, pageW - margin * 2, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");
    pdf.text("Fecha", margin + 4, y + 5.5);
    pdf.text("Categoría", margin + 36, y + 5.5);
    pdf.text("Monto", pageW - margin - 2, y + 5.5, { align: "right" });
    y += 8;

    let alterno = false;
    filas.forEach((tr) => {
      if (y + 8 > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.setFillColor(
        alterno ? 248 : 255,
        alterno ? 249 : 255,
        alterno ? 250 : 255,
      );
      pdf.rect(margin, y, pageW - margin * 2, 8, "F");

      const fecha = tr.dataset.fecha; // "YYYY-MM-DD"
      const catLabel = tr.dataset.categoria;
      const monto = tr.dataset.monto;
      const color = tr.dataset.color;

      const [fy, fm, fd] = fecha.split("-");
      const fechaLeg = `${parseInt(fd)}/${parseInt(fm)}/${fy}`;

      pdf.setFillColor(...hexToRgb(color));
      pdf.circle(margin + 32, y + 4, 2, "F");
      pdf.setTextColor(44, 62, 80);
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(9);
      pdf.text(fechaLeg, margin + 4, y + 5.5);
      pdf.text(catLabel, margin + 36, y + 5.5);
      pdf.text(fmt(parseFloat(monto)), pageW - margin - 2, y + 5.5, {
        align: "right",
      });
      y += 8;
      alterno = !alterno;
    });

    if (y + 9 > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.setFillColor(44, 62, 80);
    pdf.rect(margin, y, pageW - margin * 2, 9, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("Total", margin + 4, y + 6);
    pdf.text(
      document.getElementById("cat-total").textContent,
      pageW - margin - 2,
      y + 6,
      { align: "right" },
    );
    y += 14;
  }

  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.setFont(undefined, "normal");
  const fechaGen = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Generado el ${fechaGen} • FinanzApp`, pageW / 2, pageH - 8, {
    align: "center",
  });

  pdf.save(`FinanzApp_${MESES[currentMonth]}_${currentYear}.pdf`);

  spinner.classList.remove("active");
  btn.disabled = false;
});

// Inicializar
updateMonthLabel();
