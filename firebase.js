const firebaseConfig = {
    apiKey: "AIzaSyBO4DFqN2dlMzHcKq-yvIoztxmgqcdzN_8",
    authDomain: "monitoring-kapal-prome.firebaseapp.com",
    databaseURL: "https://monitoring-kapal-prome-default-rtdb.firebaseio.com",
    projectId: "monitoring-kapal-prome",
    storageBucket: "monitoring-kapal-prome.firebasestorage.app",
    messagingSenderId: "145793561786",
    appId: "1:145793561786:web:3f639ee3bd79cc0ba93e83"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// =============================================
// DETEKSI HALAMAN
// =============================================
const page = window.location.pathname.split('/').pop();

// =============================================
// INDEX.HTML — LOGIN
// =============================================
if (page === 'index.html' || page === '') {

    auth.onAuthStateChanged(user => {
        if (user) window.location.href = 'admin.html';
    });

    window.loginAdmin = function () {
        const email = document.getElementById('inputUsername').value.trim();
        const password = document.getElementById('inputPassword').value.trim();

        if (!email || !password) {
            alert('Email dan password harus diisi!');
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then(() => window.location.href = 'admin.html')
            .catch(err => {
                alert('Login gagal: ' + err.message);
            });
    };
}

// =============================================
// GUEST.HTML — MONITORING READONLY
// =============================================
if (page === 'guest.html') {

    window.addEventListener('load', () => {
        setTimeout(() => map.invalidateSize(), 300);

        // Follow ship toggle
        let followShip = true;
        map.on('dragstart', () => followShip = false);

        const shipIcon = L.icon({
            iconUrl: 'img/sailingB.png',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        let shipMarker = L.marker([-7.960061243011885, 112.62048652662472], { icon: shipIcon }).addTo(map);

        // ── Posisi Kapal (realtime) ──
        db.ref('ship/position').on('value', snap => {
            const pos = snap.val();
            if (!pos) return;
            const latlng = [pos.latitude, pos.longitude];
            shipMarker.setLatLng(latlng);
            document.getElementById('ship-lat').textContent = pos.latitude;
            document.getElementById('ship-lng').textContent = pos.longitude;
            // Ikuti kapal jika belum di-drag manual
            if (followShip) map.setView(latlng, 17);
        });

        // ── Kecepatan ──
        db.ref('ship/speed').on('value', snap => {
            const speed = snap.val();
            if (!speed) return;
            document.getElementById('speed-wind').textContent = speed.wind;
            document.getElementById('speed-ship').textContent = speed.ship;
        });

        // ── Log Kapal ──
        db.ref('ship/log').on('value', snap => {
            const log = snap.val();
            if (!log) return;
            updateLogCard('log-enter-arena', log.enter_arena);
            updateLogCard('log-ready', log.ready);
            updateLogCard('log-start', log.start);
            updateLogCard('log-finish', log.finish);
        });

        // ── Arena & Buoys (realtime) ──
        const arenaMarkers = {};
        db.ref('arena').on('value', snap => {
            const arenas = snap.val();
            if (!arenas) return;

            Object.keys(arenaMarkers).forEach(id => {
                arenaMarkers[id].forEach(m => map.removeLayer(m));
                delete arenaMarkers[id];
            });

            Object.entries(arenas).forEach(([id, arena]) => {
                if (!arena.status) return;
                arenaMarkers[id] = [];

                if (arena.buoys_1 && arena.color_1) {
                    Object.values(arena.buoys_1).forEach(buoy => {
                        const m = L.circleMarker([buoy.lat, buoy.lng], {
                            radius: 5,
                            color: arena.color_1,
                            fillColor: arena.color_1,
                            fillOpacity: 0.9,
                            weight: 1
                        }).addTo(map);
                        arenaMarkers[id].push(m);
                    });
                }

                if (arena.buoys_2 && arena.color_2) {
                    Object.values(arena.buoys_2).forEach(buoy => {
                        const m = L.circleMarker([buoy.lat, buoy.lng], {
                            radius: 5,
                            color: arena.color_2,
                            fillColor: arena.color_2,
                            fillOpacity: 0.9,
                            weight: 1
                        }).addTo(map);
                        arenaMarkers[id].push(m);
                    });
                }

                if (arena.finish) {
                    const m = L.marker([arena.finish.latitude, arena.finish.longitude], {
                        icon: L.divIcon({
                            className: '',
                            html: '<div style="background:#22c55e;color:white;padding:4px 8px;border-radius:6px;font-weight:bold;font-size:12px;">FINISH</div>'
                        })
                    }).addTo(map);
                    arenaMarkers[id].push(m);
                }
            });
        });
    });
}

// =============================================
// ADMIN.HTML — FULL CONTROL
// =============================================
if (page === 'admin.html') {

    auth.onAuthStateChanged(user => {
        if (!user) window.location.href = 'index.html';
    });

    window.logout = function () {
        auth.signOut().then(() => window.location.href = 'index.html');
    };

    window.addEventListener('load', () => {
        setTimeout(() => map.invalidateSize(), 300);

        // Follow ship toggle
        let followShip = true;
        map.on('dragstart', () => followShip = false);

        const shipIcon = L.icon({
            iconUrl: 'img/sailingB.png',
            iconSize: [20, 20],
            iconAnchor: [20, 20]
        });
        let shipMarker = L.marker([-7.960061243011885, 112.62048652662472], { icon: shipIcon }).addTo(map);

        // ── Posisi Kapal (realtime) ──
        db.ref('ship/position').on('value', snap => {
            const pos = snap.val();
            if (!pos) return;
            const latlng = [pos.latitude, pos.longitude];
            shipMarker.setLatLng(latlng);
            document.getElementById('ship-lat').textContent = pos.latitude;
            document.getElementById('ship-lng').textContent = pos.longitude;
            if (followShip) map.setView(latlng, 17);
        });

        // ── Kecepatan ──
        db.ref('ship/speed').on('value', snap => {
            const speed = snap.val();
            if (!speed) return;
            document.getElementById('speed-wind').textContent = speed.wind;
            document.getElementById('speed-ship').textContent = speed.ship;
        });

        // ── Log Kapal ──
        db.ref('ship/log').on('value', snap => {
            const log = snap.val();
            if (!log) return;
            updateLogCard('log-enter-arena', log.enter_arena);
            updateLogCard('log-ready', log.ready);
            updateLogCard('log-start', log.start);
            updateLogCard('log-finish', log.finish);
            setSwitch('switch-enter-arena', log.enter_arena);
            setSwitch('switch-ready', log.ready);
            setSwitch('switch-start', log.start);
            setSwitch('switch-finish', log.finish);
        });

        // ── Arena & Buoys (realtime) ──
        const arenaMarkers = {};
        db.ref('arena').on('value', snap => {
            const arenas = snap.val();
            if (!arenas) return;

            Object.keys(arenaMarkers).forEach(id => {
                arenaMarkers[id].forEach(m => map.removeLayer(m));
                delete arenaMarkers[id];
            });

            Object.entries(arenas).forEach(([id, arena]) => {
                arenaMarkers[id] = [];

                // Sync switch & label arena
                const sw = document.getElementById(`switch-arena-${id}`);
                const label = document.getElementById(`label-arena-${id}`);
                const count = document.getElementById(`count-arena-${id}`);
                if (sw) sw.checked = arena.status;
                if (label) {
                    label.textContent = arena.status ? 'On' : 'Off';
                    label.className = arena.status
                        ? 'text-sm font-bold text-green-400'
                        : 'text-sm font-bold text-white/50';
                }

                // Hitung total buoys
                const total =
                    (arena.buoys_1 ? Object.keys(arena.buoys_1).length : 0) +
                    (arena.buoys_2 ? Object.keys(arena.buoys_2).length : 0);
                if (count) count.textContent = total;

                if (!arena.status) return;

                if (arena.buoys_1 && arena.color_1) {
                    Object.values(arena.buoys_1).forEach(buoy => {
                        const m = L.circleMarker([buoy.lat, buoy.lng], {
                            radius: 10,
                            color: arena.color_1,
                            fillColor: arena.color_1,
                            fillOpacity: 0.9,
                            weight: 2
                        }).addTo(map);
                        arenaMarkers[id].push(m);
                    });
                }

                if (arena.buoys_2 && arena.color_2) {
                    Object.values(arena.buoys_2).forEach(buoy => {
                        const m = L.circleMarker([buoy.lat, buoy.lng], {
                            radius: 10,
                            color: arena.color_2,
                            fillColor: arena.color_2,
                            fillOpacity: 0.9,
                            weight: 2
                        }).addTo(map);
                        arenaMarkers[id].push(m);
                    });
                }

                if (arena.finish) {
                    const m = L.marker([arena.finish.latitude, arena.finish.longitude], {
                        icon: L.divIcon({
                            className: '',
                            html: '<div style="background:#22c55e;color:white;padding:4px 8px;border-radius:6px;font-weight:bold;font-size:12px;">FINISH</div>'
                        })
                    }).addTo(map);
                    arenaMarkers[id].push(m);
                }
            });
        });
    });

    // ── Toggle status arena ke Firebase ──
    window.toggleArena = function (id, isOn) {
        db.ref(`arena/${id}/status`).set(isOn);
    };

    // ── Toggle log kapal ke Firebase ──
    window.toggleLog = function (key, isOn) {
        db.ref(`ship/log/${key}`).set(isOn);
    };

    // ── Simpan data kordinat dari modal ──
    window.simpanKordinat = function () {
        // Loop setiap arena (1, 2, 3)
        [1, 2, 3].forEach(arenaId => {
            const tbody1 = document.getElementById(`tbody-${arenaId}-1`);
            const tbody2 = document.getElementById(`tbody-${arenaId}-2`);
            const color1 = document.getElementById(`color1-${arenaId}`)?.value;
            const color2 = document.getElementById(`color2-${arenaId}`)?.value;

            const updates = {};

            if (tbody1 && color1) {
                const buoys1 = {};
                Array.from(tbody1.rows).forEach((row, idx) => {
                    const lat = row.cells[1]?.querySelector('input')?.value;
                    const lng = row.cells[2]?.querySelector('input')?.value;
                    if (lat && lng) buoys1[`buoy_${idx + 1}`] = { lat: parseFloat(lat), lng: parseFloat(lng) };
                });
                if (Object.keys(buoys1).length > 0) {
                    updates.color_1 = color1;
                    updates.buoys_1 = buoys1;
                }
            }

            if (tbody2 && color2) {
                const buoys2 = {};
                Array.from(tbody2.rows).forEach((row, idx) => {
                    const lat = row.cells[1]?.querySelector('input')?.value;
                    const lng = row.cells[2]?.querySelector('input')?.value;
                    if (lat && lng) buoys2[`buoy_${idx + 1}`] = { lat: parseFloat(lat), lng: parseFloat(lng) };
                });
                if (Object.keys(buoys2).length > 0) {
                    updates.color_2 = color2;
                    updates.buoys_2 = buoys2;
                }
            }

            // Simpan finish jika ada
            const finishLat = document.getElementById('finish-lat')?.value;
            const finishLng = document.getElementById('finish-lng')?.value;
            if (finishLat && finishLng) {
                updates.finish = {
                    latitude: parseFloat(finishLat),
                    longitude: parseFloat(finishLng)
                };
            }

            if (Object.keys(updates).length > 0) {
                db.ref(`arena/${arenaId}`).update(updates);
            }
        });

        document.getElementById('modalKordinat').classList.add('hidden');
        alert('Data kordinat berhasil disimpan!');
    };
}

// =============================================
// HELPER FUNCTIONS
// =============================================
function updateLogCard(id, status) {
    const el = document.getElementById(id);
    if (!el) return;

    if (status) {
        el.className = 'bg-[#285E2A] border border-[#676767] p-4 mt-3 rounded-xl';
        el.querySelector('.log-icon').className = 'log-icon fa-solid fa-circle-check text-[70px] text-white/50';
        el.querySelector('.log-status').textContent = 'Complete';
    } else {
        el.className = 'bg-[#C58709] border border-[#676767] p-4 mt-3 rounded-xl';
        el.querySelector('.log-icon').className = 'log-icon fa-solid fa-circle-exclamation text-[80px] text-white/50';
        el.querySelector('.log-status').textContent = 'Pending';
    }
}

function setSwitch(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = value;
}