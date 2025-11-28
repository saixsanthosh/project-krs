/* ============================================================
   PROJECT KRS — 3D HOLOGRAM GLOBE MODULE
   - Wireframe globe
   - Equator / orbit rings
   - Pulsing marker at user location
   ============================================================ */

let globeScene, globeCamera, globeRenderer;
let globeMesh, orbitRings = [];
let globeAnimation;
let globeContainer;
let currentMarker = null;

function initGlobe() {
    globeContainer = document.getElementById("globe");
    if (!globeContainer) return;

    const w = globeContainer.clientWidth || 400;
    const h = globeContainer.clientHeight || 250;

    globeScene = new THREE.Scene();
    globeCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    globeCamera.position.set(0, 0, 3);

    globeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    globeRenderer.setSize(w, h);
    globeContainer.innerHTML = "";
    globeContainer.appendChild(globeRenderer.domElement);

    // WIRE GLOBE
    const geo = new THREE.SphereGeometry(1, 40, 40);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00eaff,
        wireframe: true,
        transparent: true,
        opacity: 0.35
    });
    globeMesh = new THREE.Mesh(geo, mat);
    globeScene.add(globeMesh);

    // ORBIT / LATITUDE RINGS
    createRings();

    // LIGHT HINT (not really needed but adds depth)
    const light = new THREE.AmbientLight(0x00eaff, 0.4);
    globeScene.add(light);

    // Start animation
    animateGlobe();

    window.addEventListener("resize", resizeGlobe);
}

function resizeGlobe() {
    if (!globeContainer || !globeRenderer || !globeCamera) return;
    const w = globeContainer.clientWidth || 400;
    const h = globeContainer.clientHeight || 250;
    globeRenderer.setSize(w, h);
    globeCamera.aspect = w / h;
    globeCamera.updateProjectionMatrix();
}

function animateGlobe() {
    globeAnimation = requestAnimationFrame(animateGlobe);
    if (globeMesh) {
        globeMesh.rotation.y += 0.0018;
        globeMesh.rotation.x += 0.0004;
    }
    orbitRings.forEach((r, idx) => {
        r.rotation.y -= 0.001 * (idx + 1);
    });
    globeRenderer.render(globeScene, globeCamera);
}

function createRings() {
    const ringColors = [0x00eaff, 0xbc00ff, 0xff00a6];
    const radii = [1.05, 1.1, 1.15];

    for (let i = 0; i < 3; i++) {
        const ringGeo = new THREE.TorusGeometry(radii[i], 0.01, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({
            color: ringColors[i],
            transparent: true,
            opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 * (i === 0 ? 1 : i === 1 ? 0.3 : -0.4);
        globeScene.add(ring);
        orbitRings.push(ring);
    }
}

// lat/lng to XYZ on sphere
function latLngToXYZ(lat, lng, radius = 1) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    return {
        x: -(radius * Math.sin(phi) * Math.cos(theta)),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta)
    };
}

function placeMarker(lat, lng) {
    if (!globeScene) return;

    const pos = latLngToXYZ(lat, lng, 1.02);

    // remove old marker
    if (currentMarker) {
        globeScene.remove(currentMarker.point);
        globeScene.remove(currentMarker.ring);
    }

    // point
    const pointGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const pointMat = new THREE.MeshBasicMaterial({ color: 0xff00a6 });
    const point = new THREE.Mesh(pointGeo, pointMat);
    point.position.set(pos.x, pos.y, pos.z);
    globeScene.add(point);

    // radar ring
    const ringGeo = new THREE.RingGeometry(0.06, 0.09, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00eaff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(pos.x, pos.y, pos.z);
    ring.lookAt(0, 0, 0);
    globeScene.add(ring);

    // animate pulse
    let scale = 1;
    function pulse() {
        if (!ring.material) return;
        scale += 0.02;
        ring.scale.set(scale, scale, scale);
        ring.material.opacity -= 0.02;
        if (ring.material.opacity <= 0.05) {
            scale = 1;
            ring.material.opacity = 0.6;
        }
        requestAnimationFrame(pulse);
    }
    pulse();

    currentMarker = { point, ring };
}

// exposed for app.js
window.setGlobeLocation = function(lat, lng) {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    placeMarker(Number(lat), Number(lng));
};

window.initGlobe = initGlobe;
