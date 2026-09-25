const container = document.getElementById("webgl-container");
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  ) || window.innerWidth < 768;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060312, 0.008);

const camera = new THREE.PerspectiveCamera(
  isMobile ? 60 : 45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const DEFAULT_CAM_POS = isMobile
  ? new THREE.Vector3(0, 12, 45)
  : new THREE.Vector3(0, 10, 40);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 6.0, 0);

camera.position.copy(DEFAULT_CAM_POS);

const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
container.appendChild(renderer.domElement);
renderer.setClearColor(0x000000, 0);
container.style.background = 'linear-gradient(rgba(0, 0, 10, 0.7), rgba(0, 0, 10, 0.7)), url("./assets/bg.jpg") center / cover no-repeat';

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 + 0.05;
controls.minDistance = 8;
controls.maxDistance = 85;
controls.target.copy(DEFAULT_CAM_TARGET);

// LIGHTS
const ambientLight = new THREE.AmbientLight(0x2a103d, 1.4);
scene.add(ambientLight);

// Đèn chính chiếu vào mặt trăng (đặt ngoài quả cầu để sáng được mặt ngoài)
const treeLight = new THREE.PointLight(0xfff0d0, 2.5, 45);
treeLight.position.set(6, 14, 12);
scene.add(treeLight);

const warmLight = new THREE.PointLight(0xffaa33, 2.0, 30);
warmLight.position.set(0, -2, 0);
scene.add(warmLight);

// đèn tím hồng áp sát tán cây để ánh sáng lan ra rực rỡ hơn
const treeGlowLight = new THREE.PointLight(0xff6fd8, 3.2, 26);
treeGlowLight.position.set(0, 8, 3);
scene.add(treeGlowLight);

// ISLAND
const islandGroup = new THREE.Group();
scene.add(islandGroup);

// HÒN ĐẢO BAY (đá thấp góc cạnh, cây mọc trên đỉnh)
islandGroup.position.set(0, 5, 0);
const MOON_RADIUS = 4; // giữ tên & bán kính cũ để cây, thỏ không phải đổi logic

const islandGeo = new THREE.IcosahedronGeometry(MOON_RADIUS, 1);
const islandPos = islandGeo.attributes.position;
const ISLAND_TOP_SQUASH = 0.5; // độ bẹt của mặt trên đảo (thỏ & cây dùng chung số này)
for (let i = 0; i < islandPos.count; i++) {
  const vx = islandPos.getX(i);
  const vy = islandPos.getY(i);
  const vz = islandPos.getZ(i);
  const jitter = 1 + (Math.random() - 0.5) * 0.22;
  // bẹt phần trên để cây đứng vững, vuốt thon nhọn phần dưới cho giống đá bay
  const ny = vy >= 0 ? vy * ISLAND_TOP_SQUASH : vy * 1.6;
  islandPos.setXYZ(i, vx * jitter, ny * jitter, vz * jitter);
}
islandGeo.computeVertexNormals();

const islandMat = new THREE.MeshStandardMaterial({
  color: 0x2a1c14,
  roughness: 0.95,
  flatShading: true,
});
const islandMesh = new THREE.Mesh(islandGeo, islandMat);
islandGroup.add(islandMesh);

// vệt cỏ/rêu rải rác trên mặt đảo cho đỡ trơ trọi
const mossGeo = new THREE.BufferGeometry();
const mossCount = 160;
const mossPos = new Float32Array(mossCount * 3);
for (let i = 0; i < mossCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const r = Math.random() * MOON_RADIUS * 0.85;
  mossPos[i * 3] = Math.cos(theta) * r;
  mossPos[i * 3 + 1] = MOON_RADIUS * 0.3 + Math.random() * 0.25;
  mossPos[i * 3 + 2] = Math.sin(theta) * r;
}
mossGeo.setAttribute("position", new THREE.BufferAttribute(mossPos, 3));
const mossMat = new THREE.PointsMaterial({
  size: 0.35,
  color: 0x4c6b32,
  transparent: true,
  opacity: 0.55,
});
islandGroup.add(new THREE.Points(mossGeo, mossMat));

// TREE TRUNK & BRANCHES
const TREE_SCALE = 0.85; // cây to hơn, nổi bật hơn trên đảo
const treeGroup = new THREE.Group();
treeGroup.position.set(0, MOON_RADIUS * 0.5 - 0.1, 0); // gốc cây cắm trên đỉnh đảo
treeGroup.scale.setScalar(TREE_SCALE);
islandGroup.add(treeGroup);

const trunkMat = new THREE.MeshStandardMaterial({
  color: 0x2b140e,
  roughness: 0.85,
});

const trunkCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.15, 2.5, -0.1),
  new THREE.Vector3(-0.1, 5.0, 0.1),
  new THREE.Vector3(0.0, 7.5, 0.0),
]);

const trunkGeo = new THREE.TubeGeometry(trunkCurve, 32, 0.28, 8, false);
const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
treeGroup.add(trunkMesh);

// hướng cành theo đường viền hình trái tim (nhìn từ trên xuống sẽ thấy rõ)
function heartDir(t) {
  const hx = 16 * Math.pow(Math.sin(t), 3);
  const hz =
    -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  const mag = Math.hypot(hx, hz) || 1;
  return { x: hx / mag, z: hz / mag };
}

const branchClusters = [];
const mainBranchCount = 18;
for (let i = 0; i < mainBranchCount; i++) {
  const t = (i / mainBranchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
  const dir = heartDir(t);
  const h = 3.0 + Math.random() * 4.0;
  const startP = trunkCurve.getPointAt(h / 7.5);
  const len = 3.6 + Math.random() * 2.4;

  const endP = new THREE.Vector3(
    startP.x + dir.x * len,
    startP.y + 0.8 + Math.random() * 1.0,
    startP.z + dir.z * len,
  );

  const midP = new THREE.Vector3().addVectors(startP, endP).multiplyScalar(0.5);
  midP.y += 0.4;

  const bCurve = new THREE.CatmullRomCurve3([startP, midP, endP]);
  const bGeo = new THREE.TubeGeometry(bCurve, 10, 0.09, 6, false);
  const bMesh = new THREE.Mesh(bGeo, trunkMat);
  treeGroup.add(bMesh);

  branchClusters.push({ center: endP, radius: 3.6 + Math.random() * 1.2 });
}

// HỆ THỐNG TÁN LÁ
const particleCount = isMobile ? 28000 : 46000;
const blossomGeo = new THREE.BufferGeometry();
const blossomPos = new Float32Array(particleCount * 3);
const blossomColors = new Float32Array(particleCount * 3);

const colorDustyPink = new THREE.Color(0xb83fc0);
const colorSoftPink = new THREE.Color(0xff5fb0);
const colorPaleRose = new THREE.Color(0xff9adf);
const colorSoftWhite = new THREE.Color(0xfff2fc);

const clusters = [
  { center: new THREE.Vector3(0, 9.2, 0), radius: 4.4 },
  { center: new THREE.Vector3(0, 7.4, 0), radius: 4.8 },
  { center: new THREE.Vector3(0, 5.6, 0), radius: 4.0 },
  ...branchClusters,
];

for (let i = 0; i < particleCount; i++) {
  const c = clusters[Math.floor(Math.random() * clusters.length)];

  const u = Math.random();
  const r = Math.pow(u, 0.65) * c.radius;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  const x = c.center.x + r * Math.sin(phi) * Math.cos(theta);
  const y = c.center.y + r * Math.sin(phi) * Math.sin(theta) * 0.8;
  const z = c.center.z + r * Math.cos(phi);

  blossomPos[i * 3] = x;
  blossomPos[i * 3 + 1] = y;
  blossomPos[i * 3 + 2] = z;

  const heightFactor = THREE.MathUtils.clamp((y - 3) / 7, 0, 1);
  const randC = Math.random();
  let col;

  if (heightFactor < 0.3) {
    col = randC < 0.6 ? colorDustyPink : colorSoftPink;
  } else if (heightFactor < 0.7) {
    col =
      randC < 0.4
        ? colorSoftPink
        : randC < 0.8
          ? colorPaleRose
          : colorDustyPink;
  } else {
    col = randC < 0.5 ? colorSoftWhite : colorPaleRose;
  }

  blossomColors[i * 3] = col.r;
  blossomColors[i * 3 + 1] = col.g;
  blossomColors[i * 3 + 2] = col.b;
}

blossomGeo.setAttribute("position", new THREE.BufferAttribute(blossomPos, 3));
blossomGeo.setAttribute("color", new THREE.BufferAttribute(blossomColors, 3));

function createParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.4, "rgba(240,182,188,0.6)");
  grad.addColorStop(1, "rgba(240,182,188,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

const blossomMat = new THREE.PointsMaterial({
  size: (isMobile ? 0.55 : 0.46) * TREE_SCALE,
  vertexColors: true,
  map: createParticleTexture(),
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const blossomParticles = new THREE.Points(blossomGeo, blossomMat);
treeGroup.add(blossomParticles);

// quầng sáng tím hồng bao quanh tán cây cho rực rỡ hơn
const treeGlowMat = new THREE.SpriteMaterial({
  map: createParticleTexture(),
  color: 0xff6fd8,
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
treeGlowMat.opacity = 0.68;
const treeGlow = new THREE.Sprite(treeGlowMat);
treeGlow.scale.set(21 * TREE_SCALE, 21 * TREE_SCALE, 1);
treeGlow.position.set(0, 7.5, 0);
treeGroup.add(treeGlow);

// vài đốm sáng lấp lánh rải trong tán cây
const sparkleCount = isMobile ? 60 : 110;
const sparkleGeo = new THREE.BufferGeometry();
const sparklePos = new Float32Array(sparkleCount * 3);
for (let i = 0; i < sparkleCount; i++) {
  const c = clusters[Math.floor(Math.random() * clusters.length)];
  const r = Math.pow(Math.random(), 0.6) * c.radius;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  sparklePos[i * 3] = c.center.x + r * Math.sin(phi) * Math.cos(theta);
  sparklePos[i * 3 + 1] = c.center.y + r * Math.sin(phi) * Math.sin(theta) * 0.8;
  sparklePos[i * 3 + 2] = c.center.z + r * Math.cos(phi);
}
sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePos, 3));
const sparkleMat = new THREE.PointsMaterial({
  size: 0.5 * TREE_SCALE,
  color: 0xffffff,
  map: createParticleTexture(),
  transparent: true,
  opacity: 0.95,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const sparkleParticles = new THREE.Points(sparkleGeo, sparkleMat);
treeGroup.add(sparkleParticles);

// RABBITS
function createRabbit() {
  const group = new THREE.Group();
  const rabbitMat = new THREE.MeshStandardMaterial({
    color: 0xf8f8ff,
    roughness: 0.5,
  });

  const bodyGeo = new THREE.SphereGeometry(0.5, 12, 12);
  bodyGeo.scale(0.8, 1, 0.9);
  const bodyMesh = new THREE.Mesh(bodyGeo, rabbitMat);
  bodyMesh.position.y = 0.4;
  group.add(bodyMesh);

  const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
  const headMesh = new THREE.Mesh(headGeo, rabbitMat);
  headMesh.position.set(0, 0.85, 0.2);
  group.add(headMesh);

  const earGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.5, 8);
  const earLeft = new THREE.Mesh(earGeo, rabbitMat);
  earLeft.position.set(-0.12, 1.25, 0.18);
  earLeft.rotation.z = 0.15;
  earLeft.rotation.x = -0.1;
  group.add(earLeft);

  const earRight = earLeft.clone();
  earRight.position.x = 0.12;
  earRight.rotation.z = -0.15;
  group.add(earRight);

  return group;
}

const RABBIT_COUNT = 5;
const rabbits = [];
for (let i = 0; i < RABBIT_COUNT; i++) {
  const rabbitMesh = createRabbit();
  islandGroup.add(rabbitMesh);

  rabbits.push({
    mesh: rabbitMesh,
    tilt: 0.5 + Math.random() * 0.45, // góc lệch so với gốc cây (rad): nhỏ = sát gốc
    orbitSpeed: (0.22 + Math.random() * 0.2) * (i % 2 === 0 ? 1 : -1),
    phase: (i / RABBIT_COUNT) * Math.PI * 2,
    hopSpeed: 4.5 + Math.random() * 2.0,
    hopHeight: 0.15,
    scale: 0.45 + Math.random() * 0.15,
  });
  rabbits[i].mesh.scale.setScalar(rabbits[i].scale);
}

const rabUp = new THREE.Vector3();
const rabFwd = new THREE.Vector3();
const rabRight = new THREE.Vector3();
const rabBasis = new THREE.Matrix4();

function updateRabbits(time) {
  rabbits.forEach((r) => {
    const angle = r.phase + time * r.orbitSpeed;
    const sign = Math.sign(r.orbitSpeed) || 1;
    const sinT = Math.sin(r.tilt);
    const hop = Math.abs(Math.sin(time * r.hopSpeed)) * r.hopHeight;

    // "hướng lên" của thỏ = pháp tuyến mặt cầu tại chỗ thỏ đứng
    rabUp.set(sinT * Math.cos(angle), Math.cos(r.tilt), sinT * Math.sin(angle));
    // hướng chạy = tiếp tuyến của vòng chạy
    rabFwd.set(-Math.sin(angle) * sign, 0, Math.cos(angle) * sign);
    rabRight.crossVectors(rabUp, rabFwd);

    rabBasis.makeBasis(rabRight, rabUp, rabFwd);
    r.mesh.quaternion.setFromRotationMatrix(rabBasis);
    // mặt trên đảo bị bẹt (ISLAND_TOP_SQUASH), nên nén riêng trục Y khi đặt vị trí
    // để thỏ đứng đúng trên mặt đá thay vì lơ lửng phía trên
    const orbitR = MOON_RADIUS - 0.05 + hop;
    r.mesh.position.set(
      rabUp.x * orbitR,
      rabUp.y * orbitR * ISLAND_TOP_SQUASH,
      rabUp.z * orbitR,
    );
  });
}

// LANTERNS & MESSAGES WITH IMAGES
const lanternsGroup = new THREE.Group();
scene.add(lanternsGroup);

const lanterns = [];
const interactiveObjects = [];

const wishList = [
  {
    text: "Chúc cậu và gia đình một mùa Trung Thu đoàn viên, tràn ngập niềm vui và hạnh phúc!",
    img: "./assets/1.jpg",
  },
  {
    text: "Cầu chúc cho mọi nguyện ước của cậu đêm nay sẽ trở thành hiện thực.",
    img: "./assets/2.jpg",
  },
  {
    text: "Trăng tròn ấm áp, Chúc cậu một mùa Trung thu đủ đầy, mỗi ngày đều nhẹ nhàng như ánh trăng đêm rằm.",
    img: "./assets/3.jpg",
  },
  {
    text: "Chúc cậu luôn giữ được tâm hồn trong trẻo, yêu đời như ánh trăng rằm.",
    img: "./assets/4.jpg",
  },
  {
    text: "Trung Thu bình an, vạn sự như ý, công danh thăng tiến rực rỡ!",
    img: "./assets/5.jpg",
  },
  {
    text: "Chúc riêng cậu một đêm trăng thật lãng mạn và ngọt ngào.",
    img: "./assets/6.jpg",
  },
  {
    text: "Sức khỏe dồi dào, tâm an yên, miệng luôn mỉm cười rạng rỡ.",
    img: "./assets/7.jpg",
  },
];

// Xáo bài: mỗi lần bấm lấy 1 câu, đủ cả vòng mới xáo lại
let wishQueue = [];
let lastWish = null;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getNextWish() {
  if (wishQueue.length === 0) {
    wishQueue = shuffle([...wishList]);
    // tránh câu đầu vòng mới trùng câu cuối vòng trước
    const last = wishQueue.length - 1;
    if (wishQueue.length > 1 && wishQueue[last] === lastWish) {
      [wishQueue[0], wishQueue[last]] = [wishQueue[last], wishQueue[0]];
    }
  }
  lastWish = wishQueue.pop();
  return lastWish;
}

function createLanternTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#ff4d4d");
  grad.addColorStop(0.5, "#e63946");
  grad.addColorStop(1, "#ffb703");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 120, 120);
  return new THREE.CanvasTexture(canvas);
}

const lanternTex = createLanternTexture();

function createLanternMesh() {
  const group = new THREE.Group();

  // Thân lồng đèn lục giác kiểu kính, có viền vàng nổi bật quanh các cạnh
  const bodyGeo = new THREE.CylinderGeometry(0.62, 0.62, 1.4, 6);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: lanternTex,
    emissive: 0xff8800,
    emissiveIntensity: 1.05,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  const edgesMat = new THREE.LineBasicMaterial({ color: 0xffe27a });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), edgesMat);
  body.add(edges);

  // nắp vàng trên và dưới
  const capGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.1, 6);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.6,
    roughness: 0.3,
  });
  const capTop = new THREE.Mesh(capGeo, capMat);
  capTop.position.y = 0.75;
  group.add(capTop);
  const capBottom = new THREE.Mesh(capGeo, capMat);
  capBottom.position.y = -0.75;
  group.add(capBottom);

  // móc treo phía trên
  const hookGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
  const hook = new THREE.Mesh(hookGeo, capMat);
  hook.position.y = 0.9;
  group.add(hook);

  // tấm vải đỏ rủ xuống bên dưới, kèm 2 sợi tua vàng
  const tagGeo = new THREE.PlaneGeometry(0.38, 0.55);
  const tagMat = new THREE.MeshBasicMaterial({
    color: 0xd90429,
    side: THREE.DoubleSide,
  });
  const tag = new THREE.Mesh(tagGeo, tagMat);
  tag.position.set(0, -1.05, 0);
  group.add(tag);

  const tasselMat = new THREE.LineBasicMaterial({ color: 0xffd700 });
  [-0.12, 0.12].forEach((dx) => {
    const pts = [
      new THREE.Vector3(dx, -1.32, 0),
      new THREE.Vector3(dx, -1.55, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geo, tasselMat));
  });

  const glowCoreMat = new THREE.SpriteMaterial({
    map: createParticleTexture(),
    color: 0xffcc55,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowCore = new THREE.Sprite(glowCoreMat);
  glowCore.scale.set(2.6, 2.6, 1);
  group.add(glowCore);

  const glowOuterMat = new THREE.SpriteMaterial({
    map: createParticleTexture(),
    color: 0xffaa00,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowOuter = new THREE.Sprite(glowOuterMat);
  glowOuter.scale.set(5.2, 5.2, 1);
  group.add(glowOuter);

  const hitGeo = new THREE.SphereGeometry(1.6, 8, 8);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  group.add(hitMesh);

  return { group, hitMesh };
}

const lanternCount = isMobile ? 24 : 38;
for (let i = 0; i < lanternCount; i++) {
  const { group: lantern, hitMesh } = createLanternMesh();

  const radius = 9 + Math.random() * 25;
  const angle = Math.random() * Math.PI * 2;
  const y = -1 + Math.random() * 30;

  lantern.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);

  const wishData = wishList[Math.floor(Math.random() * wishList.length)];

  lantern.userData = {
    speedY: 0.008 + Math.random() * 0.012,
    swingSpeed: 0.8 + Math.random() * 1.2,
    initialX: lantern.position.x,
    initialZ: lantern.position.z,
    wish: wishData.text,
    imgUrl: wishData.img,
    id: i,
  };

  const sc = 0.75 + Math.random() * 0.5;
  lantern.scale.set(sc, sc, sc);

  hitMesh.userData.parentLantern = lantern;

  lanternsGroup.add(lantern);
  lanterns.push(lantern);
  interactiveObjects.push(hitMesh);
}

// FALLING PETALS & STARS
const fallingPetalsCount = isMobile ? 80 : 180;
const petalsGeo = new THREE.BufferGeometry();
const petalsPos = new Float32Array(fallingPetalsCount * 3);
const petalsData = [];

for (let i = 0; i < fallingPetalsCount; i++) {
  petalsPos[i * 3] = (Math.random() - 0.5) * 36;
  petalsPos[i * 3 + 1] = Math.random() * 36;
  petalsPos[i * 3 + 2] = (Math.random() - 0.5) * 36;

  petalsData.push({
    speedY: 0.02 + Math.random() * 0.03,
  });
}

petalsGeo.setAttribute("position", new THREE.BufferAttribute(petalsPos, 3));
const petalsMat = new THREE.PointsMaterial({
  size: isMobile ? 0.35 : 0.3,
  color: 0xf7d1d5,
  transparent: true,
  opacity: 0.75,
  map: createParticleTexture(),
  blending: THREE.NormalBlending,
  depthWrite: false,
});

const petalsParticles = new THREE.Points(petalsGeo, petalsMat);
scene.add(petalsParticles);

const starCount = isMobile ? 400 : 900;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 180;
  starPos[i * 3 + 1] = Math.random() * 90;
  starPos[i * 3 + 2] = (Math.random() - 0.5) * 180;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.4,
  transparent: true,
  opacity: 0.7,
});
scene.add(new THREE.Points(starGeo, starMat));

// FIREWORKS
let fireworks = [];
function createFirework(pos) {
  const pCount = 50;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(pCount * 3);
  const velocities = [];

  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = pos.x;
    pPositions[i * 3 + 1] = pos.y;
    pPositions[i * 3 + 2] = pos.z;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 0.08 + Math.random() * 0.12;

    velocities.push(
      new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi),
      ),
    );
  }

  pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.35,
    color: 0xffd700,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  });

  const pMesh = new THREE.Points(pGeo, pMat);
  scene.add(pMesh);

  fireworks.push({ mesh: pMesh, velocities: velocities, life: 1.0 });
}

// RAYCASTER & INTERACTION
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetCamPos = null;
let targetCamTarget = null;
let selectedLantern = null;

const wishModal = document.getElementById("wishModal");
const wishText = document.getElementById("wishText");
const wishImage = document.getElementById("wishImage");
const closeWishBtn = document.getElementById("closeWishBtn");

let pointerDownPos = { x: 0, y: 0 };

function onPointerDown(event) {
  pointerDownPos.x =
    event.clientX || (event.touches && event.touches[0].clientX) || 0;
  pointerDownPos.y =
    event.clientY || (event.touches && event.touches[0].clientY) || 0;
}

function onPointerUp(event) {
  if (event.target.closest(".top-bar") || event.target.closest(".wish-modal"))
    return;

  const clientX =
    event.clientX ||
    (event.changedTouches && event.changedTouches[0].clientX) ||
    0;
  const clientY =
    event.clientY ||
    (event.changedTouches && event.changedTouches[0].clientY) ||
    0;

  const distMoved = Math.hypot(
    clientX - pointerDownPos.x,
    clientY - pointerDownPos.y,
  );
  if (distMoved > 8) return;

  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveObjects, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object;
    selectedLantern = hitMesh.userData.parentLantern || hitMesh.parent;
    const lPos = selectedLantern.position;

    createFirework(lPos);

    const offset = new THREE.Vector3()
      .subVectors(camera.position, lPos)
      .normalize()
      .multiplyScalar(5.5);
    targetCamPos = new THREE.Vector3().addVectors(lPos, offset);
    targetCamTarget = lPos.clone();

    const wishData = getNextWish();
    wishText.textContent = `"${wishData.text}"`;
    wishImage.src = wishData.img;

    setTimeout(() => {
      wishModal.classList.add("active");
    }, 300);
  }
}

window.addEventListener("pointerdown", onPointerDown, { passive: true });
window.addEventListener("pointerup", onPointerUp, { passive: true });

function resetCamera() {
  targetCamPos = DEFAULT_CAM_POS.clone();
  targetCamTarget = DEFAULT_CAM_TARGET.clone();
  selectedLantern = null;
}

function closeWishCard(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  wishModal.classList.remove("active");
  resetCamera();
}

closeWishBtn.addEventListener("click", closeWishCard);
closeWishBtn.addEventListener("touchend", closeWishCard);

wishModal.addEventListener("click", (e) => {
  if (e.target === wishModal) closeWishCard(e);
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeWishCard();
});

// AUDIO
const bgm = document.getElementById("bgm");
const audioBtn = document.getElementById("audio-btn");
let isPlaying = false;

audioBtn.addEventListener("click", () => {
  if (isPlaying) {
    bgm.pause();
    audioBtn.innerHTML = '<i class="fas fa-music" style="opacity:0.5;"></i>';
  } else {
    bgm
      .play()
      .then(() => {
        audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      })
      .catch(() => {});
  }
  isPlaying = !isPlaying;
});

// ANIMATION
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  lanterns.forEach((lantern) => {
    lantern.position.y += lantern.userData.speedY;
    lantern.position.x =
      lantern.userData.initialX +
      Math.sin(time * lantern.userData.swingSpeed + lantern.userData.id) * 0.4;
    lantern.position.z =
      lantern.userData.initialZ +
      Math.cos(time * lantern.userData.swingSpeed + lantern.userData.id) * 0.4;
    lantern.rotation.y += 0.005;

    if (lantern.position.y > 30) {
      lantern.position.y = -3;
    }
  });

  const pPos = petalsGeo.attributes.position.array;
  for (let i = 0; i < fallingPetalsCount; i++) {
    pPos[i * 3 + 1] -= petalsData[i].speedY;
    pPos[i * 3] += Math.sin(time + i) * 0.01;
    pPos[i * 3 + 2] += Math.cos(time + i) * 0.01;

    if (pPos[i * 3 + 1] < -3) {
      pPos[i * 3 + 1] = 30;
      pPos[i * 3] = (Math.random() - 0.5) * 36;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
  }
  petalsGeo.attributes.position.needsUpdate = true;

  for (let i = fireworks.length - 1; i >= 0; i--) {
    const fw = fireworks[i];
    fw.life -= delta * 1.2;
    const posArr = fw.mesh.geometry.attributes.position.array;

    for (let j = 0; j < fw.velocities.length; j++) {
      posArr[j * 3] += fw.velocities[j].x;
      posArr[j * 3 + 1] += fw.velocities[j].y;
      posArr[j * 3 + 2] += fw.velocities[j].z;
    }
    fw.mesh.geometry.attributes.position.needsUpdate = true;
    fw.mesh.material.opacity = fw.life;

    if (fw.life <= 0) {
      scene.remove(fw.mesh);
      fireworks.splice(i, 1);
    }
  }

  islandGroup.rotation.y = Math.sin(time * 0.15) * 0.05;

  updateRabbits(time);

  if (targetCamPos && targetCamTarget) {
    camera.position.lerp(targetCamPos, 0.04);
    controls.target.lerp(targetCamTarget, 0.04);

    if (camera.position.distanceTo(targetCamPos) < 0.1) {
      targetCamPos = null;
      targetCamTarget = null;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.fov = width < 768 ? 60 : 45;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, width < 768 ? 1.5 : 2),
  );
});
