// frontend/js/main.js

const API_SAVE_ORDER = "/save_order";
const IMAGE_PATH = "assets/";

const PRODUCTS = [
  { id: "lap-gamer-01", name: "RaptorGX 15 - Gaming Laptop", brand: "Raptor", model: "GX15", price: 79999, image: "product_laptop.jpg" },
  { id: "iphone-15-pro", name: "iPhone 15 Pro (Demo)", brand: "Apple", model: "15 Pro", price: 89999, image: "product_iphone.jpg" },
  { id: "sony-700h", name: "Sony Noise Cancelling Headphones", brand: "Sony", model: "WH-700", price: 13999, image: "product_headphones.jpg" },
  { id: "dior-sauvage", name: "Sauvage Eau de Parfum", brand: "Dior", model: "100ml", price: 4999, image: "product_perfume.jpg" },
  { id: "messi-jersey", name: "Messi Retro Jersey", brand: "FCB Official (Demo)", model: "#10", price: 2499, image: "product_jersey.jpg" },
  { id: "ps5-bundle", name: "PS5 Slim - Demo", brand: "Sony", model: "PS5 Slim", price: 44999, image: "product_ps5.jpg" },
  { id: "nike-air", name: "AirRunner Sneaker", brand: "AirMove", model: "AR-90", price: 5999, image: "product_shoes.jpg" },
  { id: "watch-classic", name: "Classic Wristwatch", brand: "TimePro", model: "Classic-X", price: 6999, image: "product_watch.jpg" },
  { id: "camera-4k", name: "4K Action Camera", brand: "ShotPro", model: "SP4K", price: 7999, image: "product_camera.jpg" },
  { id: "cosmetic-kit", name: "Luxury Cosmetic Set", brand: "Glam", model: "LuxeBox", price: 2999, image: "product_cosmetic.jpg" }
];

const KEY_CART = "cart";
const KEY_ORDER_USER = "order_user";
const KEY_USER_SELFIE = "user_selfie";

const formatINR = v => Number(v).toFixed(2);

// ---------- cart ----------
function getCart() {
  try { return JSON.parse(localStorage.getItem(KEY_CART) || "[]"); }
  catch { return []; }
}
function saveCart(c) { localStorage.setItem(KEY_CART, JSON.stringify(c)); }
function clearCart(){ localStorage.removeItem(KEY_CART); }

function addToCartById(productId, qty = 1) {
  const prod = PRODUCTS.find(p => p.id === productId);
  if (!prod) return;
  const cart = getCart();
  const idx = cart.findIndex(i => i.id === productId);
  if (idx === -1) cart.push({ ...prod, qty });
  else cart[idx].qty = (cart[idx].qty || 1) + qty;
  saveCart(cart);
}

function updateCartBadge(badgeId = "cart-count") {
  const el = document.getElementById(badgeId);
  if (!el) return;
  const cart = getCart();
  const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
  el.innerText = count || "";
}

// ---------- product grid ----------
function renderProductsGrid(containerId = "products-grid") {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  PRODUCTS.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${IMAGE_PATH + p.image}" alt="${p.name}" class="product-img"/>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <div class="product-sub">${p.brand} ${p.model}</div>
        <div class="product-price">₹ ${formatINR(p.price)}</div>
        <button class="btn-add" data-id="${p.id}">Add to cart</button>
      </div>`;
    container.appendChild(card);
  });
  container.querySelectorAll(".btn-add").forEach(btn => {
    btn.addEventListener("click", () => {
      addToCartById(btn.dataset.id);
      updateCartBadge();
      btn.innerText = "Added";
      setTimeout(() => btn.innerText = "Add to cart", 900);
    });
  });
}

// ---------- checkout ----------
function fillCheckoutForm(formSelector = "#checkout-form") {
  const form = document.querySelector(formSelector); if (!form) return;
  const saved = JSON.parse(localStorage.getItem(KEY_ORDER_USER) || "{}");
  form.name.value = saved.name || "";
  form.email.value = saved.email || "";
  form.phone.value = saved.phone || "";
  form.address.value = saved.address || "";
  form.city.value = saved.city || "";
  form.pincode.value = saved.pincode || "";
}

function checkoutFormSubmit(formSelector = "#checkout-form") {
  const form = document.querySelector(formSelector); if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      city: form.city.value.trim(),
      pincode: form.pincode.value.trim()
    };
    if (!data.name || !data.phone) {
      alert("Please provide name and phone.");
      return;
    }
    localStorage.setItem(KEY_ORDER_USER, JSON.stringify(data));
    location.href = "confirm.html";
  });
}

// ---------- selfie ----------
async function startCamera(videoElId = "selfie-video", captureBtnId = "capture-selfie") {
  const video = document.getElementById(videoElId);
  const btn = document.getElementById(captureBtnId);
  if (!video || !btn) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream; video.play();
    btn.onclick = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/png");
      localStorage.setItem(KEY_USER_SELFIE, base64);
      const thumb = document.getElementById("selfie-thumb");
      if (thumb) { thumb.src = base64; thumb.style.display = "block"; }
      stream.getTracks().forEach(t => t.stop());
      alert("Selfie captured.");
    };
  } catch (err) {
    console.warn("Camera error", err);
    alert("Unable to access camera.");
  }
}

function loadSelfieThumb(imgId = "selfie-thumb") {
  const base64 = localStorage.getItem(KEY_USER_SELFIE);
  const img = document.getElementById(imgId);
  if (!img) return;
  if (base64) { img.src = base64; img.style.display = "block"; }
  else img.style.display = "none";
}

// ---------- send order ----------
async function base64ToBlob(base64Data) {
  if (!base64Data) return null;
  const res = await fetch(base64Data);
  return await res.blob();
}

async function sendOrderToBackend() {
  const cart = getCart();
  if (!cart || cart.length === 0) {
    alert("Cart empty");
    return;
  }
  const user = JSON.parse(localStorage.getItem(KEY_ORDER_USER) || "{}");
  if (!user || !user.name || !user.phone) {
    alert("Checkout info missing");
    location.href = "checkout.html";
    return;
  }
  const total = cart.reduce((s, i) => s + (i.price * (i.qty || 1)), 0);

  const fd = new FormData();
  fd.append("name", user.name);
  fd.append("email", user.email || "");
  fd.append("phone", user.phone);
  fd.append("address", user.address || "");
  fd.append("city", user.city || "");
  fd.append("pincode", user.pincode || "");
  fd.append("items", JSON.stringify(cart));
  fd.append("total", total);

  const selfieBase = localStorage.getItem(KEY_USER_SELFIE);
  if (selfieBase) {
    const blob = await base64ToBlob(selfieBase);
    if (blob) fd.append("selfie", blob, "selfie.png");
  }

  try {
    const resp = await fetch(API_SAVE_ORDER, { method: "POST", body: fd });
    const json = await resp.json();
    if (json.ok) {
      clearCart();
      alert("Order placed. Your code: " + json.order_code);
      location.href = "verify.html?code=" + encodeURIComponent(json.order_code);
    } else {
      alert("Order failed: " + (json.message || "Unknown error"));
    }
  } catch (err) {
    console.error("Order send error", err);
    alert("Network error sending order.");
  }
}

// ---------- summary / verify ----------
function renderOrderSummary(containerId = "order-summary") {
  const container = document.getElementById(containerId); if (!container) return;
  const cart = getCart();
  const user = JSON.parse(localStorage.getItem(KEY_ORDER_USER) || "{}");
  const total = cart.reduce((s, i) => s + (i.price * (i.qty || 1)), 0);

  container.innerHTML = `
    <h3>Customer</h3>
    <p>${user.name || ""} — ${user.phone || ""}</p>
    <p>${user.address || ""}, ${user.city || ""} - ${user.pincode || ""}</p>
    <h3 style="margin-top:10px;">Items</h3>
    <ul>${cart.map(it => `<li>${it.name} × ${it.qty || 1} — ₹${formatINR(it.price * (it.qty || 1))}</li>`).join("")}</ul>
    <p style="margin-top:8px;"><strong>Total:</strong> ₹${formatINR(total)}</p>
  `;
}

function initVerifyPage() {
  updateCartBadge();
  const params = new URLSearchParams(location.search);
  const code = params.get("code") || "";
  const box = document.getElementById("verify-box");
  if (box) box.innerText = code ? `Your order code: ${code}` : "No order code.";
}

// ---------- page initialisers ----------
function initIndexPage(){ renderProductsGrid("products-grid"); updateCartBadge(); }
function initCartPage(){
  updateCartBadge();
  const area = document.getElementById("cart-area"); const cart = getCart();
  if (!area) return;
  if (!cart || cart.length === 0){
    area.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }
  area.innerHTML = "<h2>Your Cart</h2>" +
    cart.map(it => `<div class="cart-item"><span>${it.name} × ${it.qty || 1}</span><span>₹${(it.price * (it.qty || 1)).toFixed(2)}</span></div>`).join("") +
    `<div style="margin-top:10px"><strong>Total: ₹${cart.reduce((s,i)=>s+(i.price*(i.qty||1)),0).toFixed(2)}</strong></div>`;
}
function initCheckoutPage(){ fillCheckoutForm("#checkout-form"); checkoutFormSubmit("#checkout-form"); updateCartBadge(); }
function initConfirmPage(){
  renderOrderSummary("order-summary");
  loadSelfieThumb("selfie-thumb");
  if (document.getElementById("selfie-video")) startCamera("selfie-video","capture-selfie");
  const sendBtn = document.getElementById("place-order-btn");
  if (sendBtn) sendBtn.onclick = sendOrderToBackend;
}

// auto-init
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("products-grid")) initIndexPage();
  if (document.getElementById("cart-area")) initCartPage();
  if (document.getElementById("checkout-form")) initCheckoutPage();
  if (document.getElementById("order-summary") && document.getElementById("place-order-btn")) initConfirmPage();
  if (document.getElementById("verify-box")) initVerifyPage();
  setInterval(() => updateCartBadge("cart-count"), 1000);
});
