/* ==========================================================
   PROJECT KRS — CYBER COMMAND APP LOGIC
   - Orders
   - Map
   - 3D Globe (globe.js)
   - Network Graph (canvas)
   - Hacker Terminal
   ========================================================== */

const API = window.api.backend;

let map = null;
let marker = null;
let currentOrders = [];

/* ==========================================================
   TERMINAL — HACKER CODE GENERATOR
   ========================================================== */

const terminal = document.getElementById("terminal");

function randStr(len = 8) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdef";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function genTerminalLine() {
    const ops = [
        `SCAN_PORT ${randStr(4)}:${Math.floor(Math.random()*9999)}`,
        `AUTH_SESSION ${randStr(12)} INIT`,
        `TRACE_IP  ${randStr(2)}.${randStr(2)}.${randStr(2)}.${randStr(2)}`,
        `DECRYPT_SSL_KEY [${randStr(32)}]`,
        `FINGERPRINT_DEVICE ${randStr(16)}`,
        `CHECK_ORDER_HASH ${randStr(20)}`,
        `LOAD_PACKET ${randStr(10)}`,
        `PING ${randStr(2)}.${randStr(2)}.${randStr(2)}.${randStr(2)} TIME=${Math.floor(Math.random()*80)}ms`,
        `PROCESS_FRAME ${randStr(40)}`,
        `VALIDATE_SELFIE_HASH ${randStr(24)}`
    ];
    return ops[Math.floor(Math.random() * ops.length)];
}

function pushTerminal() {
    const line = document.createElement("div");
    line.className = "term-line";
    line.textContent = "> " + genTerminalLine();
    terminal.appendChild(line);
    if (terminal.children.length > 250) {
        terminal.removeChild(terminal.children[0]);
    }
    terminal.scrollTop = terminal.scrollHeight;
}

setInterval(pushTerminal, 120);

/* ==========================================================
   NETWORK GRAPH (Canvas)
   ========================================================== */

const nodeCanvas = document.getElementById("node-graph");
const nodeCtx = nodeCanvas.getContext("2d");

let graphNodes = [];
let graphLinks = [];
let highlightedNodeId = null;

function resizeGraphCanvas() {
    nodeCanvas.width = nodeCanvas.clientWidth || 400;
    nodeCanvas.height = nodeCanvas.clientHeight || 220;
}
resizeGraphCanvas();
setTimeout(resizeGraphCanvas, 400);
window.addEventListener("resize", resizeGraphCanvas);

function buildGraphFromOrders(orders) {
    graphNodes = [];
    graphLinks = [];

    // if no orders, generate fake graph so it doesn't look empty
    if (!orders || !orders.length) {
        const fake = [];
        for (let i = 0; i < 14; i++) {
            fake.push({
                order_code: "SIM-" + (i + 1),
                total: Math.floor(Math.random()*90000),
                risk_score: Math.floor(Math.random()*60)
            });
        }
        orders = fake;
    }

    const n = orders.length;
    const cx = nodeCanvas.width / 2;
    const cy = nodeCanvas.height / 2;
    const radius = Math.min(cx, cy) - 30;

    orders.forEach((o, idx) => {
        const angle = (idx / n) * Math.PI * 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        graphNodes.push({
            id: o.order_code,
            x,
            y,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            amount: o.total || 0,
            risk: o.risk_score || 0
        });
    });

    for (let i = 0; i < graphNodes.length; i++) {
        for (let j = i + 1; j < graphNodes.length; j++) {
            if (Math.random() < 0.12) {
                graphLinks.push({ a: graphNodes[i], b: graphNodes[j] });
            }
        }
    }
}

function drawGraph() {
    if (!nodeCanvas.width || !nodeCanvas.height) {
        requestAnimationFrame(drawGraph);
        return;
    }

    nodeCtx.clearRect(0, 0, nodeCanvas.width, nodeCanvas.height);
    nodeCtx.save();
    nodeCtx.globalAlpha = 0.95;

    // LINKS
    graphLinks.forEach(link => {
        nodeCtx.beginPath();
        nodeCtx.moveTo(link.a.x, link.a.y);
        nodeCtx.lineTo(link.b.x, link.b.y);
        nodeCtx.strokeStyle = "rgba(0,234,255,0.35)";
        nodeCtx.lineWidth = 1;
        nodeCtx.stroke();
    });

    // NODES
    graphNodes.forEach(node => {
        const baseRadius = 3 + Math.min(node.amount / 20000, 4);
        const pulse = Math.sin(Date.now() / 300 + node.x) * 1.5;
        const r = baseRadius + pulse;

        let color = "#00eaff";
        if (node.risk >= 50) color = "#ff0047";
        else if (node.risk >= 20) color = "#ffe600";

        if (node.id === highlightedNodeId) {
            nodeCtx.shadowColor = color;
            nodeCtx.shadowBlur = 14;
        } else {
            nodeCtx.shadowBlur = 0;
        }

        nodeCtx.beginPath();
        nodeCtx.arc(node.x, node.y, r, 0, Math.PI * 2);
        nodeCtx.fillStyle = color;
        nodeCtx.fill();
        nodeCtx.shadowBlur = 0;
    });

    nodeCtx.restore();

    // motion
    graphNodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 10 || node.x > nodeCanvas.width - 10) node.vx *= -1;
        if (node.y < 10 || node.y > nodeCanvas.height - 10) node.vy *= -1;
    });

    requestAnimationFrame(drawGraph);
}

function highlightGraphNode(orderCode) {
    highlightedNodeId = orderCode || null;
}

/* ==========================================================
   ORDERS + RENDER
   ========================================================== */

const ordersList = document.getElementById("orders-list");

function riskColor(score) {
    if (score >= 50) return "risk-high";
    if (score >= 20) return "risk-mid";
    return "risk-low";
}

function renderOrders(orders) {
    currentOrders = orders || [];
    ordersList.innerHTML = "";

    currentOrders.forEach(o => {
        const row = document.createElement("div");
        row.className = "order-row";
        row.dataset.code = o.order_code;

        row.innerHTML = `
            <div class="order-code">${o.order_code}</div>
            <div class="order-small">${o.name} — ₹${o.total}</div>
            <div class="order-small">City: ${o.city || o.city_auto || "unknown"}</div>
            <div class="order-small ${riskColor(o.risk_score || 0)}">Risk: ${o.risk_score || 0}</div>
        `;

        row.onclick = () => loadOrderDetails(o.order_code);
        ordersList.appendChild(row);
    });

    buildGraphFromOrders(currentOrders);
}

async function fetchOrders() {
    try {
        const res = await fetch(API + "/get_orders");
        const data = await res.json();
        renderOrders(data);
    } catch (err) {
        console.log("ERROR fetching orders", err);
        renderOrders([]);
    }
}

/* ==========================================================
   ORDER DETAILS + MAP + GLOBE + SELFIE
   ========================================================== */

const orderBox = document.getElementById("order-details");
const selfieImg = document.getElementById("selfie-view");

async function loadOrderDetails(code) {
    try {
        const res = await fetch(API + "/get_order?order_id=" + encodeURIComponent(code));
        const json = await res.json();
        if (!json.ok) return;
        const o = json.order;

        orderBox.innerHTML = `
ORDER CODE: ${o.order_code}
NAME: ${o.name}
PHONE: ${o.phone}
EMAIL: ${o.email}
CITY (user): ${o.city}
CITY (IP): ${o.city_auto}
REGION: ${o.region_auto}
COUNTRY: ${o.country_auto}
PINCODE: ${o.pincode}
TOTAL: ₹${o.total}
IP: ${o.ip_address}
TIMESTAMP: ${o.timestamp}
        `.trim();

        if (o.selfie_filename) {
            selfieImg.src = `${API}/selfie/${o.selfie_filename}`;
        } else {
            selfieImg.src = "";
        }

        updateMap(o);
        if (typeof setGlobeLocation === "function") {
            setGlobeLocation(o.lat, o.lng);
        }
        highlightGraphNode(o.order_code);
    } catch (err) {
        console.log("error loadOrderDetails", err);
    }
}

/* ==========================================================
   MAP
   ========================================================== */

function initMap() {
    map = L.map("map").setView([20.6, 78.9], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
}

function updateMap(order) {
    if (!map) return;

    let lat = Number(order.lat);
    let lng = Number(order.lng);

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        lat = 20.6;
        lng = 78.9;
    }

    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`
        <b>${order.order_code}</b><br>
        ${order.city || order.city_auto || ""}<br>
        ₹${order.total}
    `);
}

/* ==========================================================
   SEARCH + REFRESH
   ========================================================== */

const searchBox = document.getElementById("search-box");
searchBox.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        const query = searchBox.value.trim().toUpperCase();
        if (!query) return;
        loadOrderDetails(query);
    }
});

document.getElementById("refresh-btn").onclick = fetchOrders;
setInterval(fetchOrders, 10000);

/* ==========================================================
   INIT
   ========================================================== */

window.onload = () => {
    initMap();
    fetchOrders();
    resizeGraphCanvas();
    drawGraph();
};
