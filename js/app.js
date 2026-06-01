if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("SW registrado con éxito", reg))
      .catch((err) => console.warn("Error al registrar el SW", err));
  });
}

let dbGastos = JSON.parse(localStorage.getItem("gastos")) || [];
let presupuestoDiario =
  parseFloat(localStorage.getItem("presupuestoDiario")) || 0;
let fechaPresupuesto = localStorage.getItem("fechaPresupuesto"); // formato "YYYY-MM"
let miGrafico;

const form = document.getElementById("expense-form");
const totalSpentEl = document.getElementById("total-spent");
const totalBudgetEl = document.getElementById("total-budget");
const progressFill = document.getElementById("progress-fill");
const budgetInput = document.getElementById("budget-input");
const setBudgetBtn = document.getElementById("set-budget-btn");
const resetBudgetBtn = document.getElementById("reset-budget-btn");
const amountInput = document.getElementById("amount");

function formatearNumero(valor) {
  if (!valor) return "";
  const num = parseFloat(valor.replace(/\./g, "").replace(",", "."));
  if (isNaN(num)) return valor;
  return num.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function desformatearNumero(valor) {
  return valor.replace(/\./g, "").replace(",", ".");
}

function getMesActual() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function validarTeclaNumerica(e) {
  const tecla = e.key;
  const valor = e.target.value;

  const teclasControl = [
    "Backspace",
    "Delete",
    "Tab",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ];
  if (teclasControl.includes(tecla)) return;

  if (
    (e.ctrlKey || e.metaKey) &&
    ["a", "c", "v", "x"].includes(tecla.toLowerCase())
  )
    return;

  if (tecla === "-" || tecla === "+") {
    e.preventDefault();
    return;
  }

  if (!/^[0-9,]$/.test(tecla)) {
    e.preventDefault();
    return;
  }

  if (tecla === "," && valor.includes(",")) {
    e.preventDefault();
    return;
  }

  if (valor.includes(",")) {
    const posicionCursor = e.target.selectionStart;
    const posicionComa = valor.indexOf(",");
    const decimalesActuales = valor.slice(posicionComa + 1).length;
    if (
      tecla !== "," &&
      posicionCursor > posicionComa &&
      decimalesActuales >= 2
    ) {
      e.preventDefault();
      return;
    }
  }
}

function formatearAlEscribir(e) {
  const cursorPos = e.target.selectionStart;
  const valor = e.target.value;
  const formateado = formatearNumero(valor);
  e.target.value = formateado;
  const newPos = Math.max(0, formateado.length - (valor.length - cursorPos));
  e.target.setSelectionRange(newPos, newPos);
}

budgetInput.addEventListener("keydown", validarTeclaNumerica);
budgetInput.addEventListener("input", formatearAlEscribir);

amountInput.addEventListener("keydown", validarTeclaNumerica);
amountInput.addEventListener("input", formatearAlEscribir);

document.addEventListener("DOMContentLoaded", () => {
  const mesActual = getMesActual();
  const mesDiferente = fechaPresupuesto !== mesActual;

  if (mesDiferente) {
    presupuestoDiario = 0;
    dbGastos = [];
    localStorage.removeItem("presupuestoDiario");
    localStorage.removeItem("gastos");
    localStorage.removeItem("fechaPresupuesto");
    fechaPresupuesto = null;
    budgetInput.disabled = false;
    setBudgetBtn.disabled = false;
    budgetInput.placeholder = "Ingresa presupuesto mensual";
  } else if (presupuestoDiario > 0) {
    budgetInput.disabled = true;
    setBudgetBtn.disabled = true;
    budgetInput.placeholder = "Presupuesto ya establecido este mes";
  }

  actualizarInterfaz();
  inicializarGrafico();
});

function validarFechaGasto(fecha) {
  const hoy = new Date();
  const fechaGasto = new Date(fecha + "T00:00:00");
  return (
    fechaGasto.getFullYear() === hoy.getFullYear() &&
    fechaGasto.getMonth() === hoy.getMonth() &&
    fechaGasto.getDate() <= hoy.getDate()
  );
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const monto = parseFloat(desformatearNumero(amountInput.value));
  const fechaGasto = document.getElementById("date").value;
  const totalActual = dbGastos.reduce((acc, item) => acc + item.monto, 0);

  if (!monto || monto <= 0 || isNaN(monto)) {
    alert("Ingresa un monto válido mayor a cero.");
    return;
  }

  if (totalActual + monto > presupuestoDiario) {
    alert(
      "No puedes agregar este gasto porque excedería tu presupuesto mensual.",
    );
    return;
  }

  if (!validarFechaGasto(fechaGasto)) {
    alert("La fecha del gasto debe ser del mes actual y no puede ser futura.");
    return;
  }

  dbGastos.push({
    monto,
    categoria: document.getElementById("category").value,
    date: fechaGasto,
  });
  localStorage.setItem("gastos", JSON.stringify(dbGastos));
  form.reset();
  actualizarInterfaz();
  actualizarGrafico();
});

setBudgetBtn.addEventListener("click", () => {
  const nuevoPresupuesto = parseFloat(desformatearNumero(budgetInput.value));

  if (!nuevoPresupuesto || nuevoPresupuesto <= 0 || isNaN(nuevoPresupuesto)) {
    alert("Ingresa un presupuesto válido mayor a cero.");
    return;
  }

  presupuestoDiario = nuevoPresupuesto;
  fechaPresupuesto = getMesActual();
  localStorage.setItem("presupuestoDiario", presupuestoDiario);
  localStorage.setItem("fechaPresupuesto", fechaPresupuesto);
  budgetInput.value = "";
  budgetInput.disabled = true;
  setBudgetBtn.disabled = true;
  budgetInput.placeholder = "Presupuesto ya establecido este mes";
  actualizarInterfaz();
});

resetBudgetBtn.addEventListener("click", () => {
  presupuestoDiario = 0;
  fechaPresupuesto = null;
  dbGastos = [];
  localStorage.removeItem("presupuestoDiario");
  localStorage.removeItem("fechaPresupuesto");
  localStorage.removeItem("gastos");
  budgetInput.disabled = false;
  setBudgetBtn.disabled = false;
  budgetInput.placeholder = "Ingresa presupuesto mensual";
  budgetInput.value = "";
  actualizarInterfaz();
  actualizarGrafico();
});
function actualizarInterfaz() {
  const total = dbGastos.reduce((acc, item) => acc + item.monto, 0);
  totalSpentEl.textContent = `$${total.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  totalBudgetEl.textContent = `$${presupuestoDiario.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const porcentaje =
    presupuestoDiario > 0
      ? Math.min((total / presupuestoDiario) * 100, 100)
      : 0;
  progressFill.style.width = `${porcentaje}%`;
}

function inicializarGrafico() {
  const ctx = document.getElementById("expenseChart").getContext("2d");
  miGrafico = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [
        "Comida",
        "Transporte",
        "Ocio",
        "Servicios",
        "Ropa",
        "Entretenimiento",
        "Salud",
        "Educación",
        "Otros",
      ],
      datasets: [
        {
          label: "Gastos por Categoría",
          data: obtenerTotalesPorCategoria(),
          backgroundColor: [
            "#f1c40f",
            "#e67e22",
            "#9b59b6",
            "#34495e",
            "#1abc9c",
            "#2ecc71",
            "#e74c3c",
            "#95a5a6",
            "#7f8c8d",
          ],
        },
      ],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.parsed;
              const percentage =
                presupuestoDiario > 0
                  ? ((value / presupuestoDiario) * 100).toFixed(1)
                  : 0;
              return `${context.label}: $${value} (${percentage}% del presupuesto)`;
            },
          },
        },
      },
    },
    plugins: [],
  });
}

function actualizarGrafico() {
  miGrafico.data.datasets[0].data = obtenerTotalesPorCategoria();
  miGrafico.update();
}

function obtenerTotalesPorCategoria() {
  const categorias = [
    "comida",
    "transporte",
    "ocio",
    "servicios",
    "ropa",
    "entretenimiento",
    "salud",
    "educación",
    "otros",
  ];
  return categorias.map((cat) =>
    dbGastos
      .filter((g) => g.categoria === cat)
      .reduce((sum, g) => sum + g.monto, 0),
  );
}

window.addEventListener("online", () => {
  document.getElementById("status-online").style.background = "#27ae60";
});
window.addEventListener("offline", () => {
  document.getElementById("status-online").style.background = "#e74c3c";
  alert("Estás en modo offline. Los datos se guardarán localmente.");
});

const dbName = "MonitorRUM";
let db;

const request = indexedDB.open(dbName, 1);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains("metricas")) {
    db.createObjectStore("metricas", { keyPath: "id", autoIncrement: true });
  }
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log("IndexedDB: Base de datos RUM lista.");
};
function guardarEnIndexedDB(data) {
  if (!db) return;
  const transaction = db.transaction(["metricas"], "readwrite");
  const store = transaction.objectStore("metricas");
  store.add(data);

  transaction.oncomplete = () => {
    console.log("Dato guardado en IndexedDB: ", data.nombre);
  };
}

import { onCLS, onINP, onLCP } from "https://unpkg.com/web-vitals@3?module";
function procesarMetrica({ name, delta, value, id }) {
  const nuevaMetrica = {
    nombre: name,
    valor: value.toFixed(3),
    delta: delta.toFixed(3),
    id_sesion: id,
    fecha: new Date().toISOString(),
    url: window.location.pathname,
  };

  console.log(
    `%c RUM [${name}]:`,
    "color: #2ecc71; font-weight: bold;",
    nuevaMetrica,
  );
  guardarEnIndexedDB(nuevaMetrica);
}
onCLS(procesarMetrica);
onINP(procesarMetrica);
onLCP(procesarMetrica);
