import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (selector) => document.querySelector(selector);
const clamp = THREE.MathUtils.clamp;
const randomBetween = (min, max) => min + Math.random() * (max - min);
const root = $('#world');
const loaderEl = $('#loading');
const gameStatus = $('#game-status');
const keys = new Set();
const movement = { forward: false, back: false, left: false, right: false };
const arenaSurfaceY = 0.96;
const arenaCenterX = 0.2;
const arenaHalfWidth = 2.95;
const arenaHalfDepth = 2.85;
const characterRadius = 0.55;
const playerStart = new THREE.Vector3(-1.3, arenaSurfaceY, 0.1);
const enemyStart = new THREE.Vector3(1.4, arenaSurfaceY, -0.1);
const gravity = 20;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#71777c');
scene.fog = new THREE.FogExp2('#818183', 0.012);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
camera.position.set(0.35, 7.3, 17.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.23;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-hidden', 'true');
root.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight('#d8e3f4', '#46332d', 2.3);
scene.add(hemi);
const keyLight = new THREE.DirectionalLight('#ffd3a0', 4.5);
keyLight.position.set(-5.5, 12, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -12;
keyLight.shadow.camera.right = 12;
keyLight.shadow.camera.top = 12;
keyLight.shadow.camera.bottom = -12;
keyLight.shadow.bias = -0.00015;
keyLight.shadow.normalBias = 0.025;
keyLight.shadow.radius = 5;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight('#a4c5ee', 1.7);
fillLight.position.set(7, 7, 2);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight('#ff8c56', 2.2);
rimLight.position.set(0, 5, -8);
scene.add(rimLight);

const emberLightA = new THREE.PointLight('#ff8d4a', 14, 14, 2);
emberLightA.position.set(-5, 3.1, -3.5);
scene.add(emberLightA);
const emberLightB = new THREE.PointLight('#55d6e6', 8, 12, 2);
emberLightB.position.set(5, 2.2, 2.7);
scene.add(emberLightB);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(19, 80),
  new THREE.MeshStandardMaterial({ color: '#4b4846', roughness: 0.96, metalness: 0.02 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.11;
floor.receiveShadow = true;
scene.add(floor);

const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(11, 12.5, 0.26, 96, 1),
  new THREE.MeshStandardMaterial({ color: '#55483e', roughness: 0.9, metalness: 0.06, vertexColors: false })
);
platform.position.y = -0.08;
platform.receiveShadow = true;
platform.castShadow = true;
scene.add(platform);

const arenaGlow = new THREE.Mesh(
  new THREE.TorusGeometry(9.1, 0.035, 8, 160),
  new THREE.MeshBasicMaterial({ color: '#e4a866', transparent: true, opacity: 0.43 })
);
arenaGlow.rotation.x = Math.PI / 2;
arenaGlow.position.y = 0.065;
scene.add(arenaGlow);

function makeBackdrop() {
  const starPositions = [];
  for (let i = 0; i < 310; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = randomBetween(0.2, 1.14);
    const radius = 105;
    starPositions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      19 + radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ color: '#ffe0ae', size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.62 })
  );
  scene.add(stars);

  const mountainMaterial = new THREE.MeshStandardMaterial({ color: '#363a41', roughness: 1, flatShading: true });
  const mountainGeometry = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 26; i += 1) {
    const angle = (i / 26) * Math.PI * 2;
    const distance = randomBetween(24, 39);
    const height = randomBetween(4, 8);
    const mountain = new THREE.Mesh(
      mountainGeometry,
      mountainMaterial
    );
    mountain.scale.set(randomBetween(4, 8), height, randomBetween(3, 5));
    mountain.position.set(Math.sin(angle) * distance, -1.2, Math.cos(angle) * distance);
    mountain.castShadow = true;
    scene.add(mountain);
  }

  const lanternMaterial = new THREE.MeshBasicMaterial({ color: '#ffbd74' });
  for (const x of [-10.4, 10.4]) {
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), lanternMaterial);
    flame.position.set(x, 3.2, -2.7);
    scene.add(flame);
    const lantern = new THREE.PointLight('#ff9958', 10, 11, 2);
    lantern.position.copy(flame.position);
    scene.add(lantern);
  }
}

makeBackdrop();

const dustCount = 175;
const dustPositions = new Float32Array(dustCount * 3);
const dustData = [];
for (let i = 0; i < dustCount; i += 1) {
  const x = randomBetween(-12, 12);
  const y = randomBetween(0.2, 7.5);
  const z = randomBetween(-10, 7);
  dustPositions.set([x, y, z], i * 3);
  dustData.push({ x, y, z, speed: randomBetween(0.12, 0.55), phase: Math.random() * Math.PI * 2 });
}
const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(
  dustGeometry,
  new THREE.PointsMaterial({ color: '#f4bd79', size: 0.065, transparent: true, opacity: 0.55, depthWrite: false })
);
scene.add(dust);

const arenaGroup = new THREE.Group();
scene.add(arenaGroup);

const gltfLoader = new GLTFLoader();
gltfLoader.register((parser) => ({
  name: 'KHR_materials_pbrSpecularGlossiness',
  extendMaterialParams(materialIndex, materialParams) {
    const extension = parser.json.materials[materialIndex]?.extensions?.KHR_materials_pbrSpecularGlossiness;
    if (!extension) return;
    const diffuse = extension.diffuseFactor || [1, 1, 1, 1];
    materialParams.color.setRGB(diffuse[0], diffuse[1], diffuse[2], THREE.LinearSRGBColorSpace);
    materialParams.opacity = diffuse[3];
    materialParams.metalness = 0;
    materialParams.roughness = 1 - (extension.glossinessFactor ?? 1);
    if (extension.diffuseTexture) {
      return parser.assignTexture(materialParams, 'map', extension.diffuseTexture, THREE.SRGBColorSpace);
    }
  }
}));
const clock = new THREE.Clock();
let player;
let enemy;
let gameStarted = false;
let paused = false;
let ended = false;
let elapsed = 0;
let timer = 0;
let animationFrame = 0;
let combo = 0;
let comboExpires = 0;
let hitStop = 0;
let cameraShake = 0;
let damageFlashTimeout = 0;
let announcementTimeout = 0;
let audioContext;
let soundEnabled = false;
let lastAnnouncedCombo = 0;
let elapsedFrame = 0;
let lastHudUpdate = 0;

const moves = {
  light: { animation: 'Combat_Attack_1', damage: 75, range: 3.35, stamina: 9, cooldown: 0.55, color: '#ffc879', knockback: 1.0 },
  heavy: { animation: 'Combat_Attack_3', damage: 135, range: 3.7, stamina: 22, cooldown: 0.92, color: '#fff0d0', knockback: 1.55 },
  skill: { animation: 'Combat_ChargedSlash', damage: 225, range: 4.15, stamina: 36, cooldown: 1.8, color: '#82f2f2', knockback: 2.5 }
};

function getAnimationName(character, type) {
  const names = character.clipNames;
  if (type === 'idle') {
    const choices = character.isPlayer
      ? ['Combat_Idle', 'Combat_Idle._Capek']
      : ['A(Idle)', 'ANIM_CHASE_ExploreIDLE_01'];
    return findClip(names, [choices[character.locomotionVariant % choices.length], ...choices]);
  }
  if (type === 'run') {
    const choices = character.isPlayer
      ? ['Combat_Run', 'Explore_Run3']
      : ['ANIM_CHASE_ExploreRun_02', 'Combat_Run'];
    return findClip(names, [choices[character.locomotionVariant % choices.length], ...choices]);
  }
  if (type === 'dodge') {
    return character.isPlayer ? findClip(names, ['Combat_Dodge']) : findClip(names, ['ANIM_Chase_CombatDodge._01']);
  }
  if (type === 'hit') {
    return character.isPlayer ? findClip(names, ['Combat_Hit']) : findClip(names, ['ANIM_CHASE_HITTED_01']);
  }
  if (type === 'death') {
    return character.isPlayer ? findClip(names, ['Combat_Die', 'Combat_Fall']) : findClip(names, ['ANIM_Chase_Die_01', 'ANIM_Chase_Knockdown_01']);
  }
  return type;
}

function findClip(names, candidates) {
  for (const candidate of candidates) {
    const exact = names.find((name) => name.toLowerCase() === candidate.toLowerCase());
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const partial = names.find((name) => name.toLowerCase().includes(candidate.toLowerCase()));
    if (partial) return partial;
  }
  return null;
}

function dampAngle(current, target, smoothing, delta) {
  const difference = THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
  return current + difference * (1 - Math.exp(-smoothing * delta));
}

async function restoreCharacterMaterials(gltf) {
  const definitions = gltf.parser.json.materials || [];
  const referencedMaps = new Map();
  for (const definition of definitions) {
    const baseIndex = definition.pbrMetallicRoughness?.baseColorTexture?.index;
    const emissiveIndex = definition.emissiveTexture?.index;
    const index = baseIndex ?? emissiveIndex;
    if (index !== undefined && !referencedMaps.has(definition.name)) {
      referencedMaps.set(definition.name, await gltf.parser.getDependency('texture', index));
    }
  }

  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const restored = originals.map((original) => {
      const definition = definitions.find((item) => item.name === original.name);
      const texture = original.map || referencedMaps.get(original.name) || null;
      const isGlow = /mana|emission|glow/i.test(original.name);
      if (texture) texture.colorSpace = THREE.SRGBColorSpace;

      const material = new THREE.MeshStandardMaterial({
        name: original.name,
        color: '#ffffff',
        map: texture,
        alphaMap: original.alphaMap || null,
        transparent: original.transparent || definition?.alphaMode === 'BLEND' || false,
        opacity: original.opacity ?? 1,
        alphaTest: original.alphaTest || (definition?.alphaMode === 'MASK' ? 0.45 : 0),
        side: THREE.DoubleSide,
        vertexColors: original.vertexColors,
        depthWrite: original.depthWrite,
        roughness: isGlow ? 0.48 : /sword|blade/i.test(original.name) ? 0.36 : 0.78,
        metalness: /sword|blade|gun/i.test(original.name) ? 0.3 : 0.035,
        emissive: isGlow ? '#43d8e5' : '#000000',
        emissiveIntensity: isGlow ? 1.65 : 0
      });

      if (!texture && !isGlow && !/body|head|hair/i.test(original.name)) {
        material.color.set('#d7b891');
      }
      return material;
    });
    object.material = Array.isArray(object.material) ? restored : restored[0];
    object.castShadow = true;
    object.receiveShadow = true;
  });
  gltf.scene.updateMatrixWorld(true);
}

function makeCharacter(gltf, isPlayer) {
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 2.72 / Math.max(size.y, 0.01);
  model.scale.setScalar(scale);
  model.position.y = -bounds.min.y * scale;
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = true;
    }
  });

  const group = new THREE.Group();
  group.add(model);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 96;
  shadowCanvas.height = 96;
  const shadowContext = shadowCanvas.getContext('2d');
  if (!shadowContext) throw new Error('Unable to create the character ground-shadow texture.');
  const gradient = shadowContext.createRadialGradient(48, 48, 5, 48, 48, 47);
  gradient.addColorStop(0, 'rgba(10, 9, 8, 0.72)');
  gradient.addColorStop(0.42, 'rgba(10, 9, 8, 0.34)');
  gradient.addColorStop(1, 'rgba(10, 9, 8, 0)');
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 96, 96);
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.15),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.012;
  contactShadow.renderOrder = 1;
  group.add(contactShadow);
  scene.add(group);

  const character = {
    group,
    model,
    contactShadow,
    mixer: new THREE.AnimationMixer(model),
    clips: new Map(gltf.animations.map((clip) => [clip.name, clip])),
    clipNames: gltf.animations.map((clip) => clip.name),
    currentAction: null,
    currentName: null,
    isPlayer,
    motionRate: isPlayer ? 1 : 2,
    locomotionVariant: 0,
    locomotionClock: randomBetween(2.4, 3.5),
    animationSequence: 0,
    health: 1000,
    stamina: 100,
    speed: 0,
    velocity: new THREE.Vector3(),
    facing: isPlayer ? Math.PI / 2 : -Math.PI / 2,
    cooldown: 0,
    invulnerable: 0,
    dodgeTime: 0,
    stunTime: 0,
    attackTime: 0,
    attackHitApplied: false,
    dead: false,
    grounded: true,
    aiDecision: 0,
    aiStrafe: 0,
    home: isPlayer ? playerStart.clone() : enemyStart.clone(),
    moving: false,
    hitColor: null,
    originalMaterials: []
  };
  character.group.position.copy(character.home);
  character.group.rotation.y = character.facing;
  model.traverse((node) => {
    if (node.isMesh) {
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        character.originalMaterials.push({ material, color: material.color.clone(), emissive: material.emissive.clone() });
      }
    }
  });
  playAnimation(character, getAnimationName(character, 'idle'), true, 0.18);
  return character;
}

function playAnimation(character, name, loop = false, fade = 0.12) {
  if (!name || !character.clips.has(name)) return null;
  if (character.currentName === name && character.currentAction?.isRunning()) return character.currentAction;
  const next = character.mixer.clipAction(character.clips.get(name));
  next.reset();
  next.enabled = true;
  next.setEffectiveTimeScale(character.motionRate);
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  next.clampWhenFinished = !loop;
  if (character.currentAction && character.currentAction !== next) {
    character.currentAction.crossFadeTo(next, fade, true);
  }
  next.fadeIn(fade);
  next.play();
  character.currentAction = next;
  character.currentName = name;
  return next;
}

function toggleLoading(visible, label) {
  $('#loading-label').textContent = label;
  loaderEl.classList.toggle('is-hidden', !visible);
  $('#intro').classList.toggle('is-loading', visible);
}

async function loadAsset(path, label, progressStart, progressEnd) {
  try {
    const gltf = await gltfLoader.loadAsync(path, (event) => {
      if (!event.total) return;
      const fraction = Math.min(event.loaded / event.total, 1);
      $('#loading-progress').style.width = `${Math.round(progressStart + (progressEnd - progressStart) * fraction)}%`;
    });
    $('#loading-progress').style.width = `${progressEnd}%`;
    return gltf;
  } catch (error) {
    const message = `Unable to load ${label}. ${error.message || 'Check the asset path and refresh.'}`;
    gameStatus.textContent = message;
    $('#loading-label').textContent = message.toUpperCase();
    console.error(message, error);
    throw error;
  }
}

async function initialize() {
  const arenaPromise = loadAsset('/ancient_chinese_arena.glb', 'the arena', 0, 32);
  const playerPromise = loadAsset('/claris_-_epic_conquest_2.glb', 'Claris', 32, 66);
  const enemyPromise = loadAsset('/chase_-_epic_conquest_2.glb', 'Chase', 66, 100);
  try {
    const [arenaGltf, playerGltf, enemyGltf] = await Promise.all([arenaPromise, playerPromise, enemyPromise]);
    arenaGltf.scene.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material?.map) object.material.map.colorSpace = THREE.SRGBColorSpace;
      if (object.material?.transparent) {
        object.material.depthWrite = false;
        object.renderOrder = 2;
      }
    });
    const arenaBoundsBox = new THREE.Box3().setFromObject(arenaGltf.scene);
    const arenaCenter = arenaBoundsBox.getCenter(new THREE.Vector3());
    arenaGltf.scene.position.set(-arenaCenter.x, -arenaBoundsBox.min.y - 0.02, -arenaCenter.z);
    arenaGltf.scene.scale.setScalar(1);
    arenaGroup.add(arenaGltf.scene);

    await Promise.all([restoreCharacterMaterials(playerGltf), restoreCharacterMaterials(enemyGltf)]);
    player = makeCharacter(playerGltf, true);
    enemy = makeCharacter(enemyGltf, false);
    toggleLoading(false, '');
    gameStatus.textContent = 'The arena is ready. Press Enter the Arena to begin.';
  } catch (error) {
    toggleLoading(false, '');
    loaderEl.classList.remove('is-hidden');
    $('#loading-label').textContent = 'THE ARENA COULD NOT LOAD — CHECK THE CONSOLE AND REFRESH';
    throw error;
  }
}

function setBar(id, value, max) {
  const percent = clamp(value / max, 0, 1);
  const element = $(`#${id}`);
  element.style.transform = `scaleX(${percent})`;
  const labelId = id === 'player-health' ? 'player-health-value' : id === 'enemy-health' ? 'enemy-health-value' : id === 'player-stamina' ? 'player-stamina-value' : 'enemy-stamina-value';
  $(`#${labelId}`).textContent = String(Math.ceil(value));
}

function refreshHud() {
  if (player) {
    setBar('player-health', player.health, 1000);
    setBar('player-stamina', player.stamina, 100);
  }
  if (enemy) {
    setBar('enemy-health', enemy.health, 1000);
    setBar('enemy-stamina', enemy.stamina, 100);
  }
}

function showAnnouncement(text) {
  const element = $('#announcement');
  element.textContent = text;
  element.classList.remove('is-visible');
  void element.offsetWidth;
  element.classList.add('is-visible');
  window.clearTimeout(announcementTimeout);
  announcementTimeout = window.setTimeout(() => element.classList.remove('is-visible'), 1000);
}

function ensureAudio() {
  if (!soundEnabled || audioContext) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) audioContext = new AudioContext();
}

function playSound(frequency, duration = 0.09, type = 'triangle', volume = 0.045) {
  if (!soundEnabled) return;
  ensureAudio();
  if (!audioContext) return;
  if (audioContext.state === 'suspended') void audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(frequency * 0.42, 40), audioContext.currentTime + duration);
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function createSlashEffect(origin, color, size, direction) {
  const group = new THREE.Group();
  group.position.copy(origin);
  group.position.y += 1.12;
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(size, 0.065, 8, 36, Math.PI * 1.14), material);
  arc.rotation.set(Math.PI / 2, 0, direction < 0 ? Math.PI : 0);
  group.add(arc);
  const flash = new THREE.PointLight(color, 8, 5, 2);
  flash.position.set(0, 0.14, 0);
  group.add(flash);
  scene.add(group);

  const positions = new Float32Array(60);
  for (let i = 0; i < positions.length / 3; i += 1) {
    const angle = randomBetween(-Math.PI, Math.PI);
    const radius = randomBetween(0.18, size);
    positions.set([Math.cos(angle) * radius, randomBetween(-0.15, 0.8), Math.sin(angle) * radius], i * 3);
  }
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sparks = new THREE.Points(
    sparkGeometry,
    new THREE.PointsMaterial({ color, size: 0.075, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  group.add(sparks);
  const createdAt = elapsed;
  return { group, material, sparks, flash, createdAt, duration: 0.38, velocity: new THREE.Vector3(direction * randomBetween(0.6, 1.8), randomBetween(0.3, 1.5), randomBetween(-0.4, 0.4)) };
}

const effects = [];
function makeImpactEffect(position, color = '#ffcb75', scale = 1) {
  const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.84, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24 * scale, 0.038 * scale, 8, 36), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(position);
  ring.position.y += 0.75;
  scene.add(ring);

  const flash = new THREE.PointLight(color, 12 * scale, 5, 2);
  flash.position.copy(ring.position);
  scene.add(flash);
  const geometry = new THREE.BufferGeometry();
  const points = new Float32Array(66);
  const velocities = [];
  for (let i = 0; i < 22; i += 1) {
    points.set([position.x, position.y + 1.1, position.z], i * 3);
    const direction = new THREE.Vector3(randomBetween(-1, 1), randomBetween(0.15, 1.25), randomBetween(-1, 1)).normalize();
    velocities.push(direction.multiplyScalar(randomBetween(1.3, 5) * scale));
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const particleMaterial = new THREE.PointsMaterial({ color, size: 0.095 * scale, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  const particles = new THREE.Points(geometry, particleMaterial);
  scene.add(particles);
  effects.push({ ring, ringMaterial, flash, geometry, particles, particleMaterial, velocities, createdAt: elapsed, duration: 0.48 });
}

function tickEffects(delta) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    const progress = (elapsed - effect.createdAt) / effect.duration;
    if (progress >= 1) {
      scene.remove(effect.ring, effect.flash, effect.particles);
      effect.ring.geometry.dispose();
      effect.ringMaterial.dispose();
      effect.geometry.dispose();
      effect.particleMaterial.dispose();
      effects.splice(i, 1);
      continue;
    }
    effect.ring.scale.setScalar(1 + progress * 4);
    effect.ringMaterial.opacity = (1 - progress) * 0.8;
    effect.flash.intensity = (1 - progress) * 12;
    const positions = effect.geometry.attributes.position;
    for (let j = 0; j < effect.velocities.length; j += 1) {
      const velocity = effect.velocities[j];
      positions.array[j * 3] += velocity.x * delta;
      positions.array[j * 3 + 1] += velocity.y * delta;
      positions.array[j * 3 + 2] += velocity.z * delta;
      velocity.y -= 4.2 * delta;
    }
    positions.needsUpdate = true;
    effect.particleMaterial.opacity = 1 - progress;
  }

  for (let i = animationFrame - 1; i >= 0; i -= 1) {
    const effect = slashEffects[i];
    const progress = (elapsed - effect.createdAt) / effect.duration;
    if (progress >= 1) {
      scene.remove(effect.group);
      effect.material.dispose();
      effect.sparks.geometry.dispose();
      effect.sparks.material.dispose();
      slashEffects.splice(i, 1);
      continue;
    }
    effect.group.scale.setScalar(0.74 + progress * 0.56);
    effect.group.rotation.y += delta * 1.7;
    effect.material.opacity = (1 - progress) * 0.92;
    effect.flash.intensity = (1 - progress) * 8;
    effect.group.position.addScaledVector(effect.velocity, delta * (1 - progress));
  }
  animationFrame = slashEffects.length;
}

const slashEffects = [];

function flashCharacter(character, color) {
  for (const entry of character.originalMaterials) {
    entry.material.emissive.copy(color);
    entry.material.emissiveIntensity = 0.85;
  }
  character.hitColor = color.clone();
  window.setTimeout(() => {
    if (!character || !character.originalMaterials) return;
    for (const entry of character.originalMaterials) {
      entry.material.emissive.copy(entry.emissive);
      entry.material.emissiveIntensity = /mana|emission|glow/i.test(entry.material.name) ? 1.65 : 0;
    }
    character.hitColor = null;
  }, 145);
}

function addCombo() {
  if (elapsed < comboExpires) combo += 1;
  else combo = 1;
  comboExpires = elapsed + 2.1;
  if (combo >= 2 && combo !== lastAnnouncedCombo) {
    lastAnnouncedCombo = combo;
    showAnnouncement(`${String(combo).padStart(2, '0')} HIT COMBO`);
  }
}

function attack(attacker, moveName, isAI = false) {
  if (!attacker || attacker.dead || ended || paused || !gameStarted) return;
  const move = moves[moveName];
  if (!move) return;
  if (attacker.cooldown > 0) return;
  if (attacker.stamina < move.stamina) {
    if (!isAI) setCombatMessage('Catch your breath — stamina is low');
    playSound(120, 0.07, 'sine', 0.015);
    return;
  }
  attacker.stamina -= move.stamina;
  attacker.cooldown = move.cooldown;
  const attackRecovery = moveName === 'light' ? (attacker.isPlayer ? 0.46 : 0.72) : moveName === 'heavy' ? (attacker.isPlayer ? 0.68 : 0.9) : 0.88;
  attacker.attackHitApplied = false;
  attacker.attackMove = moveName;
  const attackIndex = attacker.animationSequence++;
  if (attacker.isPlayer) {
    const base = moves.light.animation;
    let animationName = move.animation;
    if (moveName === 'light') {
      const choices = ['Combat_Attack_1', 'Combat_Attack_2', 'Combat_Attack_3', 'Combat_Attack_4', 'Combat_Attack_5'];
      animationName = findClip(attacker.clipNames, [choices[attackIndex % choices.length], base]);
    } else if (moveName === 'heavy') {
      const choices = ['Combat_CrossSlash', 'Combat_LeapAttack', 'Combat_SwordJudgement', 'Combat_PunisherImpact'];
      animationName = findClip(attacker.clipNames, [choices[attackIndex % choices.length], 'Combat_ChargedSlash_Attack', 'Combat_Attack_3']);
    } else {
      const choices = ['Skill_SwiftStrike', 'Skill_DeadlyRush', 'Skill_ChargedSlash_Attack', 'Skill_Thrust', 'Combat_CrossSlash'];
      animationName = findClip(attacker.clipNames, [choices[attackIndex % choices.length], 'Combat_ChargedSlash_Attack']);
    }
    playAnimation(attacker, animationName || base, false, 0.055);
  } else {
    const choices = moveName === 'heavy'
      ? ['ANIM_Chase_Attack_03', 'ANIM_Chase_Attack_02']
      : ['ANIM_Chase_Attack_01', 'ANIM_Chase_Attack_02', 'ANIM_Chase_Attack_03'];
    const animationName = findClip(attacker.clipNames, [choices[attackIndex % choices.length], ...choices]);
    playAnimation(attacker, animationName, false, 0.075);
  }
  attacker.facing = Math.atan2((attacker.isPlayer ? enemy : player).group.position.x - attacker.group.position.x, (attacker.isPlayer ? enemy : player).group.position.z - attacker.group.position.z);
  attacker.group.rotation.y = attacker.facing;
  const swordTip = attacker.group.position.clone();
  swordTip.x += Math.sin(attacker.facing) * 0.85;
  swordTip.z += Math.cos(attacker.facing) * 0.85;
  slashEffects.push(createSlashEffect(swordTip, move.color, moveName === 'skill' ? 1.55 : moveName === 'heavy' ? 1.23 : 0.94, attacker.isPlayer ? 1 : -1));
  const action = attacker.currentAction;
  const expectedDuration = Math.max(action?.getClip().duration || 0.4, 0.4);
  attacker.attackTime = Math.max(
    attackRecovery,
    Math.min(expectedDuration / attacker.motionRate * 0.62, 1.1)
  );
  const hitDelay = Math.min(
    attacker.isPlayer
      ? moveName === 'light' ? 0.16 : moveName === 'heavy' ? 0.22 : 0.26
      : moveName === 'light' ? 0.27 : 0.36,
    expectedDuration / attacker.motionRate * 0.32
  );
  const attackId = (attacker.attackId || 0) + 1;
  attacker.attackId = attackId;
  window.setTimeout(() => {
    if (ended || paused || attacker.dead || attacker.attackId !== attackId || attacker.attackHitApplied) return;
    resolveAttack(attacker, moveName, move, isAI);
  }, hitDelay * 1000);
  playSound(moveName === 'skill' ? 430 : moveName === 'heavy' ? 300 : 220, 0.13, 'sawtooth', 0.022);
}

function resolveAttack(attacker, moveName, move, isAI) {
  if (!attacker || attacker.dead || ended) return;
  attacker.attackHitApplied = true;
  const defender = attacker.isPlayer ? enemy : player;
  if (!defender || defender.dead) return;
  const distance = attacker.group.position.distanceTo(defender.group.position);
  if (distance > move.range || defender.invulnerable > 0) {
    if (!isAI) setCombatMessage(distance > move.range ? 'Too far — close the distance' : 'Perfect dodge');
    return;
  }
  const toDefender = defender.group.position.clone().sub(attacker.group.position).normalize();
  toDefender.y = 0;
  toDefender.normalize();
  const facingVector = new THREE.Vector3(Math.sin(attacker.facing), 0, Math.cos(attacker.facing));
  if (facingVector.dot(toDefender) < 0.05) {
    if (!isAI) setCombatMessage('Turn toward your opponent to land the hit');
    return;
  }

  const damage = Math.round(move.damage * (distance > move.range * 0.79 ? 0.78 : 1));
  defender.health = Math.max(0, defender.health - damage);
  defender.stunTime = defender.isPlayer ? 0.31 : 0.45;
  defender.velocity.addScaledVector(toDefender, move.knockback);
  defender.velocity.y = Math.max(defender.velocity.y, moveName === 'skill' ? 2 : moveName === 'heavy' ? 1.15 : 0.55);
  defender.grounded = false;
  defender.invulnerable = 0.15;
  playAnimation(defender, getAnimationName(defender, 'hit'), false, 0.04);
  flashCharacter(defender, new THREE.Color(move.color));
  makeImpactEffect(defender.group.position, move.color, moveName === 'skill' ? 1.45 : moveName === 'heavy' ? 1.15 : 0.9);
  hitStop = moveName === 'skill' ? 0.11 : moveName === 'heavy' ? 0.075 : 0.045;
  cameraShake = moveName === 'skill' ? 0.34 : moveName === 'heavy' ? 0.23 : 0.13;
  playSound(moveName === 'skill' ? 125 : moveName === 'heavy' ? 85 : 145, 0.2, 'triangle', 0.065);
  refreshHud();

  if (attacker.isPlayer) {
    addCombo();
    setCombatMessage(`${damage} DAMAGE <span>·</span> keep the pressure on`);
  } else {
    $('#damage-flash').classList.remove('is-hit');
    void $('#damage-flash').offsetWidth;
    $('#damage-flash').classList.add('is-hit');
    window.clearTimeout(damageFlashTimeout);
    damageFlashTimeout = window.setTimeout(() => $('#damage-flash').classList.remove('is-hit'), 500);
    setCombatMessage(`You took ${damage} damage <span>·</span> find your opening`);
  }

  if (defender.health <= 0) {
    defender.dead = true;
    defender.velocity.set(0, 0, 0);
    playAnimation(defender, getAnimationName(defender, 'death'), false, 0.055);
    finishMatch(attacker.isPlayer);
  }
}

function setCombatMessage(html) {
  $('#combat-message').innerHTML = html;
}

function dodge(character) {
  if (!character || !gameStarted || paused || ended || character.dead || character.cooldown > 0.15 || character.stamina < 15) return;
  character.stamina -= 15;
  character.cooldown = 0.48;
  character.dodgeTime = 0.52;
  character.invulnerable = 0.53;
  const direction = character.isPlayer
    ? new THREE.Vector3((movement.right ? 1 : 0) - (movement.left ? 1 : 0), 0, (movement.back ? 1 : 0) - (movement.forward ? 1 : 0))
    : enemy.group.position.clone().sub(player.group.position).setY(0).cross(new THREE.Vector3(0, 1, 0));
  if (direction.lengthSq() < 0.01) direction.set(Math.cos(character.facing), 0, -Math.sin(character.facing));
  direction.normalize();
  character.velocity.addScaledVector(direction, character.isPlayer ? 7.8 : 8.6);
  character.velocity.y = Math.max(character.velocity.y, character.isPlayer ? 2.5 : 2.8);
  character.grounded = false;
  const dodgeAnimation = character.isPlayer
    ? getAnimationName(character, 'dodge')
    : findClip(character.clipNames, [
      `ANIM_Chase_CombatDodge._0${(character.animationSequence++ % 2) + 1}`,
      'ANIM_Chase_CombatDodge._01'
    ]);
  playAnimation(character, dodgeAnimation, false, 0.04);
  slashEffects.push(createSlashEffect(character.group.position, '#b8d7e8', 0.67, character.isPlayer ? 1 : -1));
  playSound(275, 0.12, 'triangle', 0.024);
  if (character.isPlayer) setCombatMessage('Quick step — you’re untouchable for a moment');
  refreshHud();
}

function finishMatch(playerWon) {
  ended = true;
  gameStarted = false;
  showAnnouncement(playerWon ? 'THE LAST LIGHT SHINES ON' : 'THE ARENA CLAIMS ITS PRICE');
  $('#result-title').textContent = playerWon ? 'VICTORY' : 'DEFEAT';
  $('#result-copy').textContent = playerWon ? 'The arena remembers the blade of dawn.' : 'Rise again. The arena waits.';
  gameStatus.textContent = playerWon ? 'Victory. The arena remembers the blade of dawn.' : 'Defeat. Rise again when you are ready.';
  window.setTimeout(() => $('#result-overlay').classList.add('is-visible'), 650);
}

function startMatch() {
  if (!player || !enemy) return;
  ended = false;
  paused = false;
  gameStarted = true;
  timer = 99.99;
  elapsed = 0;
  combo = 0;
  lastAnnouncedCombo = 0;
  $('#round-status').textContent = 'FIGHT FOR THE DAWN';
  $('#intro').classList.add('is-hidden');
  $('#result-overlay').classList.remove('is-visible');
  $('#paused-overlay').classList.remove('is-visible');
  showAnnouncement('FIGHT!');
  resetCharacters(false);
  gameStatus.textContent = 'The duel has begun. Move with WASD, attack with J or K, dodge with Shift, or use your special with Q.';
  ensureAudio();
}

function resetCharacters(resetHealth) {
  for (const character of [player, enemy]) {
    character.group.position.copy(character.home);
    character.velocity.set(0, 0, 0);
    character.grounded = true;
    character.speed = 0;
    character.facing = character.isPlayer ? Math.PI / 2 : -Math.PI / 2;
    character.group.rotation.y = character.facing;
    character.cooldown = 0;
    character.invulnerable = 0;
    character.dodgeTime = 0;
    character.stunTime = 0;
    character.attackTime = 0;
    character.attackHitApplied = false;
    character.dead = false;
    character.attackId = (character.attackId || 0) + 1;
    character.animationSequence = 0;
    character.locomotionVariant = 0;
    character.locomotionClock = randomBetween(2.4, 3.5);
    character.aiDecision = 0;
    character.mixer.stopAllAction();
    character.currentAction = null;
    character.currentName = null;
    for (const entry of character.originalMaterials) {
      entry.material.emissive.copy(entry.emissive);
      entry.material.emissiveIntensity = /mana|emission|glow/i.test(entry.material.name) ? 1.65 : 0;
    }
    if (resetHealth) {
      character.health = 1000;
      character.stamina = 100;
    }
    playAnimation(character, getAnimationName(character, 'idle'), true, 0.12);
  }
  lastHudUpdate = 0;
  refreshHud();
  $('#round-timer').innerHTML = '99<span>:</span>99';
}

function finishByTime() {
  if (player.health === enemy.health) {
    finishMatch(false);
    return;
  }
  finishMatch(player.health > enemy.health);
}

function pauseGame() {
  if (!gameStarted || ended) return;
  paused = !paused;
  $('#paused-overlay').classList.toggle('is-visible', paused);
  $('#round-status').textContent = paused ? 'TIME SUSPENDED' : 'FIGHT FOR THE DAWN';
  if (paused) {
    gameStatus.textContent = 'Game paused. Press Escape or the resume button to continue.';
    keys.clear();
    for (const key of Object.keys(movement)) movement[key] = false;
  } else {
    gameStatus.textContent = 'The duel has resumed.';
    clock.getDelta();
  }
}

function spawnEnemyMove() {
  if (!enemy || !player || ended || paused || !gameStarted || enemy.dead) return;
  const distance = enemy.group.position.distanceTo(player.group.position);
  if (distance > 3.25 && enemy.stamina > 8) {
    if (Math.random() < 0.45) {
      attack(enemy, Math.random() < 0.42 ? 'heavy' : 'light', true);
    }
  } else if (enemy.stamina > 20 && Math.random() < 0.32) {
    attack(enemy, Math.random() < 0.22 ? 'heavy' : 'light', true);
  } else if (Math.random() < 0.36) {
    dodge(enemy);
  }
}

function updateCharacter(character, delta) {
  if (!character || character.dead || paused || ended || !gameStarted) return;
  character.cooldown = Math.max(0, character.cooldown - delta);
  character.invulnerable = Math.max(0, character.invulnerable - delta);
  character.stamina = Math.min(100, character.stamina + delta * (character.attackTime > 0 ? 8 : 17));
  character.stunTime = Math.max(0, character.stunTime - delta);
  character.dodgeTime = Math.max(0, character.dodgeTime - delta);
  character.attackTime = Math.max(0, character.attackTime - delta);

  let inputX = 0;
  let inputZ = 0;
  if (character.isPlayer) {
    inputX = (keys.has('d') || keys.has('arrowright') || movement.right ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') || movement.left ? 1 : 0);
    inputZ = (keys.has('s') || keys.has('arrowdown') || movement.back ? 1 : 0) - (keys.has('w') || keys.has('arrowup') || movement.forward ? 1 : 0);
  } else {
    const distance = character.group.position.distanceTo(player.group.position);
    character.aiDecision -= delta;
    const toPlayer = player.group.position.clone().sub(character.group.position).setY(0);
    if (toPlayer.lengthSq() > 0.001) {
      toPlayer.normalize();
      if (distance > 2.55) {
        inputX = toPlayer.x;
        inputZ = toPlayer.z;
      } else if (distance < 1.35) {
        inputX = -toPlayer.x * 0.55;
        inputZ = -toPlayer.z * 0.55;
      } else {
        character.aiStrafe = Math.sin(elapsed * 1.15) > 0 ? 0.25 : -0.25;
        inputX = toPlayer.x * 0.1 + character.aiStrafe * -toPlayer.z;
        inputZ = toPlayer.z * 0.1 + character.aiStrafe * toPlayer.x;
      }
      if (character.aiDecision <= 0) {
        character.aiDecision = randomBetween(0.75, 1.15);
        if (distance < 3.55 && Math.random() < 0.44) {
          spawnEnemyMove();
        }
      }
    }
  }

  const input = new THREE.Vector3(inputX, 0, inputZ);
  if (input.lengthSq() > 1) input.normalize();
  const canMove = character.stunTime <= 0 && character.attackTime <= 0;
  const runSpeed = character.isPlayer ? (keys.has('shift') ? 5.2 : 3.75) : 4.7;
  const targetVelocity = canMove ? input.multiplyScalar(runSpeed) : new THREE.Vector3();
  const accelerating = targetVelocity.lengthSq() > 0;
  const acceleration = character.stunTime > 0 ? 2.8 : accelerating ? (character.isPlayer ? 16 : 17) : 20;
  character.velocity.x = THREE.MathUtils.damp(character.velocity.x, targetVelocity.x, acceleration, delta);
  character.velocity.z = THREE.MathUtils.damp(character.velocity.z, targetVelocity.z, acceleration, delta);
  character.group.position.x += character.velocity.x * delta;
  character.group.position.z += character.velocity.z * delta;

  const maxX = arenaHalfWidth - characterRadius;
  const maxZ = arenaHalfDepth - characterRadius;
  const offsetX = character.group.position.x - arenaCenterX;
  const edgeRatio = Math.max(
    Math.abs(offsetX) / maxX,
    Math.abs(character.group.position.z) / maxZ
  );
  if (edgeRatio > 1) {
    character.group.position.x = arenaCenterX + offsetX / edgeRatio;
    character.group.position.z /= edgeRatio;
    if (Math.sign(character.group.position.x) === Math.sign(character.velocity.x)) character.velocity.x = 0;
    if (Math.sign(character.group.position.z) === Math.sign(character.velocity.z)) character.velocity.z = 0;
  }

  character.velocity.y -= gravity * delta;
  character.group.position.y += character.velocity.y * delta;
  if (character.group.position.y <= arenaSurfaceY) {
    character.group.position.y = arenaSurfaceY;
    character.velocity.y = 0;
    character.grounded = true;
  } else {
    character.grounded = false;
  }
  if (!character.grounded) {
    character.contactShadow.material.opacity = clamp(
      0.3 - (character.group.position.y - arenaSurfaceY) * 0.32,
      0.08,
      0.3
    );
    character.contactShadow.scale.setScalar(
      1 + clamp(character.group.position.y - arenaSurfaceY, 0, 1.8) * 0.12
    );
  } else {
    character.contactShadow.material.opacity = 0.3;
    character.contactShadow.scale.setScalar(1);
  }
  character.moving = Math.hypot(character.velocity.x, character.velocity.z) > 0.8;

  const opponent = character.isPlayer ? enemy : player;
  if (opponent) {
    const direction = opponent.group.position.clone().sub(character.group.position).setY(0);
    const distance = direction.length();
    if (distance > 0.001) {
      const desired = Math.atan2(direction.x, direction.z);
      const turnSpeed = character.moving ? 5 : 10;
      character.facing += THREE.MathUtils.euclideanModulo(desired - character.facing + Math.PI, Math.PI * 2) - Math.PI;
      character.group.rotation.y = dampAngle(character.group.rotation.y, character.facing, turnSpeed, delta);
      if (distance < 1.3) {
        const push = direction.normalize().multiplyScalar((1.3 - distance) * 0.5);
        character.group.position.addScaledVector(push, -1);
        character.velocity.addScaledVector(push.normalize(), -0.5);
      }
    }
  }

  const lockedAction = character.attackTime > 0 || character.dodgeTime > 0 || character.stunTime > 0;
  if (!lockedAction) {
    const desired = character.moving ? getAnimationName(character, 'run') : getAnimationName(character, 'idle');
    if (desired && character.currentName !== desired) {
      playAnimation(character, desired, true, 0.16);
      character.locomotionClock = randomBetween(character.moving ? 2.6 : 4.5, character.moving ? 4 : 6.5);
    }
    character.locomotionClock -= delta;
    if (character.locomotionClock <= 0) {
      character.locomotionVariant += 1;
      const variation = getAnimationName(character, character.moving ? 'run' : 'idle');
      if (variation && variation !== character.currentName) playAnimation(character, variation, true, 0.2);
      character.locomotionClock = randomBetween(character.moving ? 2.6 : 4.5, character.moving ? 4 : 6.5);
    }
    if (character.moving && character.currentAction) {
      const speed = Math.hypot(character.velocity.x, character.velocity.z);
      const strideRate = character.isPlayer ? speed / 3.25 : speed / 3.35 * 1.95;
      character.currentAction.timeScale = clamp(
        strideRate / character.motionRate,
        character.isPlayer ? 0.9 : 1.25 / character.motionRate,
        character.isPlayer ? 1.4 : 2.45 / character.motionRate
      );
    }
  }
  const heading = character.group.rotation.y;
  const lateralSpeed = character.velocity.x * Math.cos(heading) - character.velocity.z * Math.sin(heading);
  const forwardSpeed = character.velocity.x * Math.sin(heading) + character.velocity.z * Math.cos(heading);
  character.model.rotation.z = THREE.MathUtils.damp(character.model.rotation.z, clamp(-lateralSpeed * 0.012, -0.07, 0.07), 9, delta);
  character.model.rotation.x = THREE.MathUtils.damp(character.model.rotation.x, clamp(-forwardSpeed * 0.01, -0.055, 0.055), 8, delta);
  character.mixer.update(delta);
}

const cameraTarget = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();
function updateCamera(delta) {
  if (!player || !enemy) return;
  const combatMidpoint = player.group.position.clone().lerp(enemy.group.position, 0.5);
  cameraTarget.set(combatMidpoint.x, arenaSurfaceY + 0.72, combatMidpoint.z);
  const separation = player.group.position.distanceTo(enemy.group.position);
  const dolly = clamp((separation - 5) * 0.4, 0, 4);
  cameraOffset.set(combatMidpoint.x, 7.1, combatMidpoint.z + 17.4 + dolly);
  camera.position.lerp(cameraOffset, 1 - Math.exp(-delta * 1.6));
  if (cameraShake > 0) {
    camera.position.x += randomBetween(-cameraShake, cameraShake);
    camera.position.y += randomBetween(-cameraShake, cameraShake) * 0.52;
    cameraShake = Math.max(0, cameraShake - delta * 1.7);
  }
  camera.lookAt(cameraTarget);
}

function formatTime(seconds) {
  const remaining = Math.max(0, Math.ceil(seconds * 100));
  return `${String(Math.floor(remaining / 100)).padStart(2, '0')}<span>:</span>${String(remaining % 100).padStart(2, '0')}`;
}

function update(delta) {
  if (paused) return;
  elapsed += delta;
  const positions = dustGeometry.attributes.position;
  for (let i = 0; i < dustCount; i += 1) {
    const data = dustData[i];
    positions.array[i * 3 + 1] = ((data.y + elapsed * data.speed) % 8) + 0.2;
    positions.array[i * 3] = data.x + Math.sin(elapsed * 0.23 + data.phase) * 0.55;
  }
  positions.needsUpdate = true;
  emberLightA.intensity = 12 + Math.sin(elapsed * 2.1) * 2.2 + Math.sin(elapsed * 4.7) * 1.1;
  emberLightB.intensity = 7 + Math.sin(elapsed * 1.5 + 2) * 1.5;
  arenaGlow.material.opacity = 0.32 + Math.sin(elapsed * 1.4) * 0.09;
  tickEffects(delta);

  if (gameStarted && !ended && player && enemy) {
    timer = Math.max(0, timer - delta);
    $('#round-timer').innerHTML = formatTime(timer);
    if (timer <= 0) finishByTime();
    if (elapsed - elapsedFrame > 0.85) {
      elapsedFrame = elapsed;
      if (combo > 0 && elapsed > comboExpires) {
        combo = 0;
        lastAnnouncedCombo = 0;
      }
    }

    if (hitStop > 0) {
      hitStop = Math.max(0, hitStop - delta);
    } else {
      updateCharacter(player, delta);
      updateCharacter(enemy, delta);
    }
    if (elapsed - lastHudUpdate >= 0.08) {
      lastHudUpdate = elapsed;
      refreshHud();
    }
  } else {
    player?.mixer.update(delta * 0.8);
    enemy?.mixer.update(delta * 0.8);
    if (!gameStarted && player && enemy) {
      const sway = Math.sin(elapsed * 0.3) * 0.035;
      player.group.rotation.y = dampAngle(player.group.rotation.y, Math.PI / 2 + sway, 1.2, delta);
      enemy.group.rotation.y = dampAngle(enemy.group.rotation.y, -Math.PI / 2 - sway, 1.2, delta);
    }
  }
  updateCamera(delta);
}

function render() {
  const rawDelta = Math.min(clock.getDelta(), 0.05);
  update(rawDelta);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function resize() {
  const width = Math.max(root.clientWidth, 1);
  const height = Math.max(root.clientHeight, 1);
  camera.aspect = width / height;
  camera.fov = width < 600 ? 43 : 38;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 760 ? 1.35 : 1.7));
}

window.addEventListener('resize', resize);
resize();
void initialize();
render();

function performAction(action) {
  if (!gameStarted || ended || paused) return;
  if (action === 'light' || action === 'heavy' || action === 'skill') attack(player, action);
  else if (action === 'dodge') dodge(player);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  if (key === 'h') {
    toggleControlCard();
    return;
  }
  if (key === 'escape') {
    if (ended) return;
    pauseGame();
    return;
  }
  if (key === 'enter' && !gameStarted && player && enemy && !ended) {
    startMatch();
    return;
  }
  keys.add(key);
  if (event.repeat) return;
  if (key === 'j' || key === ' ') performAction('light');
  if (key === 'k') performAction('heavy');
  if (key === 'q' || key === 'e') performAction('skill');
  if (key === 'shift') dodge(player);
});

window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => {
  keys.clear();
  for (const key of Object.keys(movement)) movement[key] = false;
  if (gameStarted && !paused && !ended) pauseGame();
});

$('#start-button').addEventListener('click', startMatch);
$('#rematch-button').addEventListener('click', () => {
  $('#result-overlay').classList.remove('is-visible');
  resetCharacters(true);
  startMatch();
});
$('#pause-button').addEventListener('click', pauseGame);
$('#resume-button').addEventListener('click', pauseGame);
function toggleControlCard() {
  const card = $('#control-card');
  const expanded = $('#control-card-toggle').getAttribute('aria-expanded') === 'true';
  card.classList.toggle('is-collapsed', expanded);
  $('#control-card-toggle').setAttribute('aria-expanded', String(!expanded));
  $('#control-card-icon').textContent = expanded ? '+' : '−';
}
$('#control-card-toggle').addEventListener('click', toggleControlCard);
document.querySelectorAll('.ability').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    performAction(action);
    button.classList.add('is-active');
    window.setTimeout(() => button.classList.remove('is-active'), 145);
  });
});
document.querySelectorAll('.mobile-dpad button').forEach((button) => {
  const move = button.dataset.move;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    movement[move] = true;
    button.setPointerCapture(event.pointerId);
  });
  const release = () => { movement[move] = false; };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});
document.querySelectorAll('.mobile-attacks button').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    performAction(button.dataset.action);
  });
});
$('#sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  $('#sound-toggle').classList.toggle('is-muted', !soundEnabled);
  $('.sound-on').style.display = soundEnabled ? 'block' : 'none';
  $('.sound-off').style.display = soundEnabled ? 'none' : 'block';
  if (soundEnabled) {
    ensureAudio();
    playSound(510, 0.1, 'sine', 0.025);
  }
});
