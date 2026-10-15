import * as T from "three";
import { batchMeshes, batchEnvironment } from "./geometry";
import { colors, regions, heroes, enemies, type HeroDef } from "./content";
import type { Unit, CombatEvent } from "./combat";
const mat = (color: string | number, metalness = 0) =>
  new T.MeshStandardMaterial({ color, roughness: 0.72, metalness });
const gold = mat("#d6ad56", 0.65),
  iron = mat("#7a91a5", 0.6),
  dark = mat("#20283b"),
  skin = mat("#e5b28a"),
  white = mat("#fff4d4"),
  wood = mat("#654b3e");
function mesh(
  g: T.BufferGeometry,
  m: T.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: T.Object3D,
) {
  const a = new T.Mesh(g, m);
  a.position.set(x, y, z);
  a.castShadow = true;
  a.receiveShadow = true;
  parent?.add(a);
  return a;
}
function box(
  p: T.Object3D,
  m: T.Material,
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
) {
  return mesh(new T.BoxGeometry(w, h, d), m, x, y, z, p);
}
function ball(
  p: T.Object3D,
  m: T.Material,
  r: number,
  x = 0,
  y = 0,
  z = 0,
  detail = 1,
) {
  return mesh(new T.IcosahedronGeometry(r, detail), m, x, y, z, p);
}
function cyl(
  p: T.Object3D,
  m: T.Material,
  r1: number,
  r2: number,
  h: number,
  x = 0,
  y = 0,
  z = 0,
  n = 8,
) {
  return mesh(new T.CylinderGeometry(r1, r2, h, n), m, x, y, z, p);
}
function cone(
  p: T.Object3D,
  m: T.Material,
  r: number,
  h: number,
  x = 0,
  y = 0,
  z = 0,
) {
  return mesh(new T.ConeGeometry(r, h, 8), m, x, y, z, p);
}
export interface Figure {
  root: T.Group;
  body: T.Group;
  head: T.Group;
  left: T.Group;
  right: T.Group;
  weapon: T.Group;
  home: T.Vector3;
  look: string;
  dead: boolean;
  seed: number;
}
export function character(
  look: string,
  color: string,
  index = 0,
  faction = -1,
): Figure {
  const root = new T.Group(),
    body = new T.Group(),
    head = new T.Group(),
    left = new T.Group(),
    right = new T.Group(),
    weapon = new T.Group();
  root.add(body);
  body.add(head, left, right);
  right.add(weapon);
  const accent = mat(color, 0.25),
    cloth = mat(new T.Color(color).multiplyScalar(0.45).getHex()),
    flesh =
      faction >= 0 && !/treant|golem/.test(look)
        ? mat(
            ["#8db373", "#78a685", "#e0d6bd", "#a5d9e5", "#c56a59", "#a48cc9"][
              faction
            ],
          )
        : /monster|beast|treant|golem|demon|skeleton|lich|sovereign/.test(look)
          ? mat(
              look === "treant"
                ? "#7d965e"
                : look === "demon"
                  ? "#bc6555"
                  : look === "skeleton"
                    ? "#e1d3b5"
                    : color,
            )
          : skin;
  if (look === "spider" || look === "turret") {
    if (look === "spider") {
      const abdomen = ball(body, cloth, 0.62, 0, 0.7, -0.35, 2);
      abdomen.scale.z = 1.35;
      head.position.set(0, 0.85, 0.4);
      ball(head, flesh, 0.38);
      for (let i = 0; i < 6; i++) {
        const x = ((i % 3) - 1) * 0.19,
          y = Math.floor(i / 3) * 0.15;
        ball(head, gold, 0.065, x, y, 0.32);
        ball(head, dark, 0.035, x, y, 0.375);
      }
      for (const side of [-1, 1])
        for (let i = 0; i < 4; i++) {
          const z = (i - 1.5) * 0.35;
          const leg = cyl(body, cloth, 0.045, 0.075, 0.85, side * 0.6, 0.55, z);
          leg.rotation.z = side * 0.95;
          const foot = cyl(
            body,
            accent,
            0.035,
            0.05,
            0.7,
            side * 0.98,
            0.22,
            z + 0.04,
          );
          foot.rotation.z = -side * 0.4;
        }
      for (const side of [-1, 1]) {
        const fang = cone(head, white, 0.065, 0.23, side * 0.18, -0.2, 0.31);
        fang.rotation.x = Math.PI * 0.2;
        fang.rotation.z = Math.PI;
      }
    } else {
      cyl(body, iron, 0.45, 0.6, 0.3, 0, 0.25, 0);
      for (const side of [-1, 1]) {
        const foot = box(body, iron, 0.15, 0.55, 0.2, side * 0.4, 0.18, 0);
        foot.rotation.z = side * 0.65;
      }
      cyl(body, gold, 0.12, 0.17, 0.7, 0, 0.7, 0);
      head.position.y = 1.12;
      ball(head, iron, 0.38);
      box(head, gold, 0.55, 0.12, 0.12, 0, 0.08, 0.29);
      for (const x of [-0.15, 0.15])
        ball(
          head,
          new T.MeshBasicMaterial({ color: "#8cddff" }),
          0.07,
          x,
          0.08,
          0.38,
        );
      right.position.set(0.28, 1.12, 0.2);
      const barrel = cyl(weapon, iron, 0.13, 0.17, 0.7, 0, 0, 0.28);
      barrel.rotation.x = Math.PI / 2;
      cyl(body, wood, 0.23, 0.23, 0.4, -0.35, 0.9, -0.15);
    }
    for (const group of [head, weapon, left, right, body]) batchMeshes(group);
    return {
      root,
      body,
      head,
      left,
      right,
      weapon,
      home: new T.Vector3(),
      look,
      dead: false,
      seed: index * 1.73,
    };
  }
  const bulky = /brute|monster|dwarf|golem|king|beast|demon/.test(look),
    robe =
      /mage|druid|necromancer|priest|plague|warlock|firelord|mermaid|lich|sovereign/.test(
        look,
      );
  const width = bulky ? 0.76 : 0.59;
  // Oversized boots, layered tunic, articulated arms and a sculpted expressive head.
  for (const x of [-0.23, 0.23]) {
    box(body, dark, 0.33, 0.25, 0.48, x, 0.16, 0.08);
    cyl(body, cloth, 0.12, 0.14, 0.42, x, 0.46, 0);
    box(body, gold, 0.34, 0.06, 0.49, x, 0.25, 0.08);
  }
  if (robe) cone(body, cloth, 0.55, 0.9, 0, 0.78, 0);
  else box(body, cloth, width, 0.66, 0.39, 0, 0.86, 0);
  box(body, accent, width + 0.04, 0.25, 0.43, 0, 1.07, 0.025);
  box(body, wood, width + 0.08, 0.11, 0.47, 0, 0.68, 0.02);
  box(body, gold, 0.16, 0.15, 0.05, 0, 0.68, 0.27);
  for (const x of [-1, 1]) {
    const a = x < 0 ? left : right;
    a.position.set(x * (width / 2 + 0.1), 1.08, 0);
    ball(
      a,
      /knight|viking|paladin|angel/.test(look) ? iron : accent,
      bulky ? 0.26 : 0.2,
    );
    cyl(a, cloth, 0.12, 0.13, 0.4, 0, -0.23, 0);
    ball(a, flesh, 0.14, 0, -0.47, 0.02);
    box(a, gold, 0.27, 0.08, 0.27, 0, -0.36, 0);
  }
  head.position.y = 1.58;
  ball(head, flesh, bulky ? 0.46 : 0.39, 0, 0, 0, 2);
  const muzzle = ball(head, flesh, 0.23, 0, -0.12, 0.24, 1);
  muzzle.scale.set(1, 0.65, 0.6);
  for (const x of [-1, 1]) {
    ball(head, white, 0.083, x * 0.15, 0.035, 0.335, 2);
    ball(head, dark, 0.045, x * 0.15, 0.035, 0.407, 2);
    const brow = box(head, dark, 0.17, 0.045, 0.06, x * 0.15, 0.135, 0.35);
    brow.rotation.z = x * 0.14;
    ball(head, flesh, 0.115, x * 0.37, -0.025, 0);
  }
  box(head, dark, 0.17, 0.035, 0.03, 0, -0.2, 0.37);
  ball(head, flesh, 0.08, 0, -0.055, 0.4);
  if (faction === 0)
    for (const side of [-1, 1]) {
      const ear = cone(head, flesh, 0.16, 0.5, side * 0.46, 0.04, 0);
      ear.rotation.z = -side * 1.15;
    }
  if (faction === 2 || look === "skeleton") {
    for (const x of [-0.15, 0.15]) ball(head, dark, 0.085, x, 0.035, 0.36);
    box(head, dark, 0.08, 0.09, 0.06, 0, -0.1, 0.4);
    for (let i = 0; i < 5; i++)
      box(head, white, 0.035, 0.09, 0.05, (i - 2) * 0.045, -0.23, 0.38);
  }
  if (faction === 4 && look !== "demon")
    for (const side of [-1, 1]) {
      const horn = cone(head, gold, 0.1, 0.35, side * 0.25, 0.4, 0);
      horn.rotation.z = -side * 0.4;
    }
  if (/knight|viking|angel|king/.test(look)) {
    const helm = ball(head, iron, 0.42, 0, 0.13, -0.04, 1);
    helm.scale.y = 0.65;
    box(head, gold, 0.07, 0.4, 0.63, 0, 0.26, -0.04);
    for (const x of [-1, 1])
      box(head, iron, 0.12, 0.3, 0.2, x * 0.34, -0.03, 0.1);
    if (look === "viking") {
      for (const x of [-1, 1]) {
        const horn = cone(head, white, 0.13, 0.4, x * 0.43, 0.31, 0);
        horn.rotation.z = x * -0.6;
      }
    } else cone(head, accent, 0.15, 0.5, 0, 0.6, -0.07);
  } else if (/mage|warlock|necromancer|plague|lich/.test(look)) {
    cyl(head, cloth, 0.52, 0.5, 0.08, 0, 0.25, 0);
    const hat = cone(head, accent, 0.36, 0.73, 0, 0.62, -0.05);
    hat.rotation.z = 0.13;
    box(head, gold, 0.16, 0.12, 0.05, 0, 0.36, 0.33);
  } else if (/dwarf/.test(look)) {
    const beard = cone(head, mat("#c55d38"), 0.34, 0.65, 0, -0.35, 0.22);
    beard.rotation.z = Math.PI;
    for (let j = -2; j <= 2; j++)
      cyl(head, mat("#d16c39"), 0.05, 0.04, 0.39, j * 0.09, -0.35, 0.32);
    ball(head, mat("#bb5e33"), 0.36, 0, 0.22, -0.1);
  } else if (/rogue|archer/.test(look)) {
    const hood = ball(head, cloth, 0.42, 0, 0.1, -0.09);
    hood.scale.z = 0.85;
    box(head, cloth, 0.65, 0.16, 0.13, 0, -0.15, 0.32);
  } else if (/druid|priest|mermaid|angel/.test(look)) {
    ball(head, mat(index % 2 ? "#ded7ab" : "#a6684b"), 0.4, 0, 0.13, -0.13);
    cyl(head, gold, 0.4, 0.4, 0.08, 0, 0.28, 0);
    for (const x of [-1, 1]) {
      cone(head, accent, 0.13, 0.3, x * 0.3, 0.42, 0);
      const hair = ball(head, mat("#d8c393"), 0.18, x * 0.31, -0.12, -0.12);
      hair.scale.y = 2.2;
    }
  } else if (/beast|monster|demon|treant|golem|sovereign/.test(look)) {
    for (const x of [-1, 1]) {
      const horn = cone(
        head,
        look === "treant" ? wood : gold,
        0.15,
        0.52,
        x * 0.31,
        0.4,
        -0.05,
      );
      horn.rotation.z = -x * 0.5;
      cone(head, white, 0.07, 0.21, x * 0.16, -0.25, 0.38).rotation.z = Math.PI;
    }
    if (look === "beast")
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * Math.PI * 2;
        const tuft = cone(
          head,
          mat("#c58b47"),
          0.16,
          0.4,
          Math.sin(a) * 0.4,
          Math.cos(a) * 0.4,
          -0.1,
        );
        tuft.rotation.z = -a;
      }
  } else {
    for (let j = 0; j < 5; j++) {
      const tuft = cone(
        head,
        look === "firelord" ? accent : mat("#784e3c"),
        0.13,
        0.36,
        (j - 2) * 0.12,
        0.37,
        -0.03,
      );
      tuft.rotation.z = (j - 2) * -0.2;
    }
  }
  weapon.position.set(0.03, -0.35, 0.1);
  if (/archer/.test(look)) {
    const bow = mesh(
      new T.TorusGeometry(0.36, 0.045, 5, 12, Math.PI),
      gold,
      0,
      0.12,
      0.13,
      weapon,
    );
    bow.rotation.z = -Math.PI / 2;
    const string = box(weapon, white, 0.02, 0.73, 0.02, 0.0, 0.12, 0.13);
    string.position.x = -0.03;
    box(weapon, wood, 0.6, 0.035, 0.035, 0, 0.15, 0.13);
  } else if (
    /mage|druid|priest|necromancer|warlock|plague|firelord|lich|sovereign|mermaid/.test(
      look,
    )
  ) {
    cyl(weapon, wood, 0.035, 0.05, 1.35, 0, 0.32, 0);
    ball(weapon, gold, 0.16, 0, 1.02, 0);
    const gem = ball(weapon, accent, 0.15, 0, 1.16, 0);
    gem.material = new T.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.7,
    });
    for (let j = 0; j < 3; j++)
      cone(
        weapon,
        gold,
        0.06,
        0.25,
        Math.sin(j * 2.1) * 0.15,
        1.09,
        Math.cos(j * 2.1) * 0.15,
      );
  } else if (/brute|dwarf|viking|engineer|golem/.test(look)) {
    cyl(weapon, wood, 0.045, 0.045, 1, 0, 0.22, 0);
    box(weapon, iron, 0.53, 0.32, 0.3, 0, 0.75, 0);
    box(weapon, gold, 0.12, 0.36, 0.35, 0, 0.75, 0);
  } else {
    box(weapon, wood, 0.06, 0.28, 0.06, 0, 0.03, 0);
    box(weapon, gold, 0.36, 0.07, 0.09, 0, 0.2, 0);
    const blade = box(weapon, iron, 0.12, 0.66, 0.055, 0, 0.55, 0);
    blade.rotation.z = 0.02;
    cone(weapon, iron, 0.084, 0.2, 0, 0.98, 0).rotation.y = Math.PI / 4;
  }
  if (/knight|king|angel/.test(look)) {
    const shield = cyl(left, accent, 0.32, 0.36, 0.1, 0, -0.25, 0.26, 6);
    shield.rotation.x = Math.PI / 2;
    box(left, gold, 0.09, 0.5, 0.06, 0, -0.25, 0.34);
    box(left, gold, 0.4, 0.08, 0.06, 0, -0.23, 0.35);
  }
  if (look === "angel") {
    for (const x of [-1, 1])
      for (let j = 0; j < 5; j++) {
        const wing = box(
          body,
          white,
          0.14,
          0.65 - j * 0.07,
          0.06,
          x * (0.4 + j * 0.1),
          1.3 - j * 0.07,
          -0.23,
        );
        wing.rotation.z = -x * (0.4 + j * 0.15);
      }
  }
  if (look === "engineer") {
    box(body, wood, 0.52, 0.6, 0.26, 0, 1, -0.35);
    ball(head, gold, 0.13, -0.15, 0.06, 0.39);
    ball(head, gold, 0.13, 0.15, 0.06, 0.39);
  }
  if (look === "king" || look === "sovereign") {
    cyl(head, gold, 0.44, 0.38, 0.13, 0, 0.4, 0);
    for (let i = 0; i < 6; i++)
      cone(
        head,
        gold,
        0.07,
        0.25,
        Math.sin((i * Math.PI) / 3) * 0.4,
        0.55,
        Math.cos((i * Math.PI) / 3) * 0.4,
      );
  }
  if (look === "necromancer")
    for (let i = 0; i < 5; i++) {
      const skull = ball(
        body,
        white,
        0.075,
        (i - 2) * 0.12,
        1.13 - Math.abs(i - 2) * 0.025,
        0.3,
      );
      ball(skull, dark, 0.015, -0.025, 0.01, 0.06);
      ball(skull, dark, 0.015, 0.025, 0.01, 0.06);
    }
  if (look === "warlock" || look === "sovereign")
    for (let i = 0; i < 4; i++) {
      const shard = ball(
        body,
        accent,
        0.14,
        Math.sin(i * 1.57) * 0.8,
        1.3 + Math.cos(i * 1.57) * 0.5,
        -0.1,
      );
      shard.scale.y = 2;
    }
  if (look === "treant") {
    for (const side of [-1, 1])
      for (let j = 0; j < 3; j++) {
        const branch = cyl(
          body,
          wood,
          0.045,
          0.08,
          0.65,
          side * (0.5 + j * 0.12),
          1.4 + j * 0.2,
          -0.1,
        );
        branch.rotation.z = side * 0.6;
        ball(
          body,
          mat("#67a371"),
          0.25,
          side * (0.65 + j * 0.13),
          1.75 + j * 0.2,
          -0.1,
        );
      }
    for (let i = 0; i < 5; i++)
      box(body, wood, 0.07, 0.7, 0.05, (i - 2) * 0.12, 0.9, 0.25);
  }
  if (look === "golem")
    for (const side of [-1, 1]) {
      const shoulder = ball(
        body,
        mat("#b5e3ef", 0.3),
        0.35,
        side * 0.6,
        1.25,
        0,
      );
      shoulder.scale.y = 1.25;
      for (let j = 0; j < 3; j++)
        cone(
          body,
          mat("#abdff0"),
          0.12,
          0.5,
          side * (0.45 + j * 0.12),
          1.6 + j * 0.1,
          0,
        );
    }
  if (look === "demon")
    for (const side of [-1, 1]) {
      const wing = cone(
        body,
        mat(faction === 3 ? "#81bfd9" : "#893b47"),
        0.5,
        1.2,
        side * 0.7,
        1.2,
        -0.3,
      );
      wing.rotation.z = side * -0.5;
      box(body, mat("#ef915b"), 0.06, 0.65, 0.05, side * 0.2, 0.92, 0.25);
    }
  if (look === "lich") {
    const veil = cone(body, mat("#a89ab9"), 0.6, 0.7, 0, 1.05, -0.14);
    veil.rotation.x = 0.2;
    ball(
      head,
      new T.MeshBasicMaterial({ color: "#98edec" }),
      0.04,
      -0.15,
      0.035,
      0.42,
    );
    ball(
      head,
      new T.MeshBasicMaterial({ color: "#98edec" }),
      0.04,
      0.15,
      0.035,
      0.42,
    );
  }
  // Individual crest, cape and decorative gem make repeated archetypes distinguishable.
  const cape = box(body, accent, width * 0.85, 0.7, 0.04, 0, 0.89, -0.25);
  cape.rotation.x = -0.18;
  ball(body, gold, 0.08, 0, 1.15, 0.25);
  ball(body, accent, 0.052, 0, 1.15, 0.31);
  for (const group of [head, weapon, left, right, body]) batchMeshes(group);
  root.scale.setScalar(bulky ? 1.08 : 1);
  return {
    root,
    body,
    head,
    left,
    right,
    weapon,
    home: new T.Vector3(),
    look,
    dead: false,
    seed: index * 1.73,
  };
}
interface Particle {
  mesh: T.Mesh;
  velocity: T.Vector3;
  life: number;
  max: number;
}
export class World {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
  environment = new T.Group();
  figures = new Map<string, Figure>();
  particles: Particle[] = [];
  ray = new T.Raycaster();
  mouse = new T.Vector2();
  clickables: T.Object3D[] = [];
  mode = "town";
  low = false;
  localLights = 0;
  time = 0;
  last = 0;
  target = new T.Vector3(0, 0.5, 0);
  camTarget = new T.Vector3(12, 13, 17);
  onPick: (id: string) => void = () => {};
  eventAnim: {
    event: CombatEvent;
    time: number;
    duration: number;
    from: T.Vector3;
    to: T.Vector3;
    projectile?: T.Mesh;
  } | null = null;
  selected: string | null = null;
  ring: T.Mesh;
  sun: T.DirectionalLight;
  constructor(public canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    const low = new URLSearchParams(location.search).get("quality") === "low";
    this.low = low;
    this.renderer.setPixelRatio(low ? 0.6 : Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !low;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.setClearColor("#152332");
    this.scene.fog = new T.Fog("#152332", 27, 55);
    this.scene.add(new T.HemisphereLight("#e8f4ff", "#5a5362", 2.3));
    this.sun = new T.DirectionalLight("#ffdfa1", 3);
    this.sun.position.set(-7, 14, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -15;
    this.sun.shadow.camera.right = 15;
    this.sun.shadow.camera.top = 15;
    this.sun.shadow.camera.bottom = -15;
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun);
    this.scene.add(this.environment);
    this.camera.position.copy(this.camTarget);
    this.ring = mesh(
      new T.TorusGeometry(0.65, 0.035, 8, 48),
      new T.MeshBasicMaterial({ color: "#ffe2a0" }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.scene.add(this.ring);
    window.addEventListener("resize", () => this.resize());
    canvas.addEventListener("pointerup", (e) => {
      if (Math.abs(e.movementX) > 5) return;
      this.mouse.set(
        (e.clientX / innerWidth) * 2 - 1,
        (-e.clientY / innerHeight) * 2 + 1,
      );
      this.ray.setFromCamera(this.mouse, this.camera);
      const hit = this.ray.intersectObjects(this.clickables, true)[0];
      if (hit) {
        let o: T.Object3D | null = hit.object;
        while (o && !o.userData.id) o = o.parent;
        if (o) this.onPick(o.userData.id);
      }
    });
    this.resize();
    this.town();
    requestAnimationFrame((t) => this.frame(t));
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
  clear() {
    this.localLights = 0;
    for (const c of [...this.environment.children]) {
      c.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          for (const m of materials)
            if (![gold, iron, dark, skin, white, wood].includes(m)) m.dispose();
        }
      });
      this.environment.remove(c);
    }
    this.figures.clear();
    this.clickables = [];
    if (this.eventAnim?.projectile) {
      this.scene.remove(this.eventAnim.projectile);
      this.eventAnim.projectile.geometry.dispose();
      (this.eventAnim.projectile.material as T.Material).dispose();
    }
    this.eventAnim = null;
    this.ring.visible = false;
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as T.Material).dispose();
    }
    this.particles = [];
  }
  light(p: T.Object3D, x: number, z: number, color = "#ffb453") {
    const light = new T.PointLight(color, 7, 5, 2);
    light.position.set(x, 1.7, z);
    if (!this.low && this.localLights < 2) {
      p.add(light);
      this.localLights++;
    }
    cyl(p, wood, 0.08, 0.12, 1.3, x, 0.65, z);
    ball(p, new T.MeshBasicMaterial({ color }), 0.13, x, 1.4, z);
  }
  tree(x: number, z: number, scale = 1, color = "#668b65") {
    const g = new T.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    this.environment.add(g);
    cyl(g, wood, 0.14, 0.23, 1.5, 0, 0.7, 0);
    for (let i = 0; i < 3; i++)
      cone(g, mat(color), 0.9 - i * 0.18, 1.3, 0, 1.35 + i * 0.55, 0);
  }
  building(
    id: string,
    x: number,
    z: number,
    w: number,
    h: number,
    color: string,
    style = 0,
  ) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    g.userData.id = id;
    this.environment.add(g);
    this.clickables.push(g);
    const stone = mat("#b4ad98"),
      roof = mat(color);
    box(g, stone, w, h, w * 0.8, 0, h / 2, 0);
    box(g, wood, w + 0.05, 0.12, w * 0.82, 0, 0.15, 0);
    box(g, wood, w + 0.08, 0.12, w * 0.82, 0, h - 0.15, 0);
    for (const side of [-1, 1])
      box(g, wood, 0.13, h, 0.14, side * w * 0.43, h / 2, w * 0.405);
    const r = cone(g, roof, w * 0.87, h * 0.65, 0, h + h * 0.25, 0);
    r.rotation.y = Math.PI / 4;
    r.scale.z = 0.83;
    box(g, wood, 0.55, 0.88, 0.08, 0, 0.45, w * 0.41);
    box(g, gold, 0.07, 0.07, 0.05, 0.16, 0.42, w * 0.47);
    for (const side of [-1, 1]) {
      box(g, dark, 0.34, 0.45, 0.06, side * w * 0.29, h * 0.6, w * 0.42);
      box(
        g,
        mat("#efc875"),
        0.25,
        0.32,
        0.07,
        side * w * 0.29,
        h * 0.6,
        w * 0.46,
      );
      box(g, wood, 0.035, 0.38, 0.09, side * w * 0.29, h * 0.6, w * 0.5);
    }
    box(g, wood, 0.12, 1, 0.12, 0, h + 0.4, 0);
    const flag = box(g, roof, 0.65, 0.38, 0.04, 0.3, h + 0.7, 0);
    flag.rotation.y = 0.25;
    if (style === 1) {
      const tower = cyl(
        g,
        stone,
        0.55,
        0.65,
        h * 1.5,
        w * 0.55,
        h * 0.75,
        -0.1,
        8,
      );
      cone(g, roof, 0.7, 0.8, tower.position.x, h * 1.5 + 0.3, -0.1);
    }
    this.light(g, -w * 0.5, w * 0.48);
    return g;
  }
  town() {
    this.clear();
    this.mode = "town";
    this.camTarget.set(13, 15, 19);
    this.target.set(0, 0, 0);
    this.scene.fog = new T.Fog("#152332", 27, 55);
    const island = cyl(
      this.environment,
      mat("#444b48"),
      10.6,
      9.3,
      1.2,
      0,
      -0.75,
      0,
      10,
    );
    island.rotation.y = 0.15;
    cyl(this.environment, mat("#788271"), 10.5, 10.5, 0.16, 0, -0.1, 0, 10);
    for (let i = 0; i < 80; i++) {
      const x = Math.sin(i * 17.2) * 9,
        z = Math.cos(i * 9.2) * 8;
      if (Math.abs(x) < 2 || Math.abs(z) < 1.1)
        box(
          this.environment,
          mat(i % 2 ? "#a59e89" : "#b2a58c"),
          0.8,
          0.06,
          0.65,
          x,
          0.02,
          z,
        );
      else if (i % 3 === 0) this.tree(x, z, 0.6 + (i % 4) * 0.12);
    }
    this.building("roster", -4.5, -3, 2.6, 2.4, "#547f91", 1);
    this.building("campaign", 0, -5, 2.5, 3.4, "#627f91", 1);
    this.building("raids", 4, -3.8, 2.1, 2.3, "#9b5760", 1);
    this.building("training", -5.6, 0.7, 1.8, 1.5, "#927145");
    this.building("forge", 4.7, 0.2, 2.3, 1.9, "#7b657d");
    this.building("quests", -3.8, 4, 1.7, 1.8, "#6a8254");
    this.building("treasury", 3.6, 4.2, 1.8, 2, "#a88648");
    const portal = new T.Group();
    portal.position.set(0, 0.1, 3.3);
    portal.userData.id = "portal";
    this.environment.add(portal);
    this.clickables.push(portal);
    cyl(portal, mat("#8b89a0"), 1.2, 1.35, 0.3);
    const ring = mesh(
      new T.TorusGeometry(0.8, 0.16, 6, 24),
      gold,
      0,
      1.2,
      0,
      portal,
    );
    ring.rotation.y = -0.2;
    const glow = mesh(
      new T.CircleGeometry(0.65, 40),
      new T.MeshBasicMaterial({
        color: "#a0cffd",
        transparent: true,
        opacity: 0.7,
        side: T.DoubleSide,
      }),
      0,
      1.2,
      0,
      portal,
    );
    glow.rotation.y = -0.2;
    const lamp = new T.PointLight("#9cc9ff", 10, 7);
    lamp.position.set(0, 1, 3);
    if (!this.low) this.environment.add(lamp);
    for (let i = 0; i < 4; i++) {
      const f = character(heroes[i].look, colors[heroes[i].element], i);
      f.root.position.set(-1.6 + i * 1.1, 0, 0.5);
      f.root.rotation.y = 0.35;
      f.root.scale.multiplyScalar(0.72);
      f.home.copy(f.root.position);
      this.environment.add(f.root);
      this.figures.set(`town${i}`, f);
    }
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      box(
        this.environment,
        mat("#85847c"),
        0.8,
        0.4,
        0.8,
        Math.sin(a) * 10,
        0.1,
        Math.cos(a) * 10,
      );
    }
    this.light(this.environment, -2, -2);
    this.light(this.environment, 2, -2);
    batchEnvironment(
      this.environment,
      new Set([...this.figures.values()].map((f) => f.root)),
    );
  }
  arena(region: number, units: Unit[], boss = false) {
    this.clear();
    this.mode = "battle";
    this.target.set(0, 0.9, 0);
    this.camTarget.set(9, 10, 13);
    const r = regions[region];
    const floor = mat(r.floor),
      stone = mat(new T.Color(r.floor).multiplyScalar(1.25).getHex());
    box(this.environment, mat("#293038"), 13, 0.8, 10, 0, -0.55, 0);
    for (let x = -6; x <= 6; x++)
      for (let z = -4; z <= 4; z++) {
        const tile = box(
          this.environment,
          (x + z) % 3 === 0 ? stone : floor,
          0.96,
          0.12,
          0.96,
          x,
          -0.07,
          z,
        );
        tile.rotation.y = Math.sin(x * z) * 0.012;
      }
    for (const x of [-5.7, 5.7])
      for (const z of [-3.8, 3.8]) {
        cyl(this.environment, stone, 0.42, 0.5, 0.25, x, 0.1, z);
        cyl(this.environment, stone, 0.3, 0.35, 2.7, x, 1.5, z);
        box(this.environment, stone, 0.85, 0.28, 0.85, x, 2.9, z);
        this.light(this.environment, x, z, r.color);
        if (region === 1) this.tree(x, z, 1.2);
      }
    for (let i = 0; i < 9; i++) {
      box(
        this.environment,
        stone,
        1.3,
        1.2 + (i % 2) * 0.25,
        0.7,
        -5.6 + i * 1.4,
        0.5,
        -4.6,
      );
      if (i % 2 === 0)
        box(this.environment, stone, 0.6, 0.4, 0.8, -5.6 + i * 1.4, 1.25, -4.6);
    }
    if (region === 0) {
      for (const x of [-4, 4]) {
        box(this.environment, wood, 0.8, 0.8, 0.8, x, 0.4, -2.8);
        box(this.environment, iron, 0.83, 0.09, 0.83, x, 0.3, -2.8);
      }
    }
    if (region === 1)
      for (let i = 0; i < 8; i++)
        this.tree(
          Math.sin(i * 3.2) * 6,
          -4 + Math.cos(i) * 0.8,
          1.1,
          "#425b65",
        );
    if (region === 3)
      for (let i = 0; i < 10; i++)
        cone(
          this.environment,
          mat("#96d9ee"),
          0.35,
          1.1 + Math.sin(i) * 0.5,
          Math.sin(i * 4) * 5,
          0.5,
          -3.6 + Math.cos(i),
        );
    if (region === 4)
      for (const x of [-5, 5])
        box(
          this.environment,
          new T.MeshBasicMaterial({ color: "#ff6538" }),
          0.3,
          0.04,
          7,
          x,
          0.02,
          0,
        );
    if (region === 5) {
      for (let i = 0; i < 10; i++) {
        const crystal = ball(
          this.environment,
          mat("#947bb8", 0.5),
          0.45,
          Math.sin(i) * 5,
          1.3 + (i % 3) * 0.5,
          -3.6,
        );
        crystal.scale.y = 2;
      }
    }
    if (boss) {
      const banner = box(
        this.environment,
        mat(r.color),
        1.2,
        2,
        0.06,
        0,
        2.5,
        -4.15,
      );
      banner.rotation.z = 0.04;
      ball(this.environment, gold, 0.22, 0, 2.7, -4.05);
    }
    this.sync(units);
    batchEnvironment(
      this.environment,
      new Set([...this.figures.values()].map((f) => f.root)),
    );
  }
  roomObject(kind: string) {
    const p = new T.Group();
    p.position.set(0, 0, 0);
    this.environment.add(p);
    if (kind === "treasure") {
      box(p, wood, 1.45, 0.8, 0.85, 0, 0.4, 0);
      const lid = box(p, wood, 1.5, 0.18, 0.9, 0, 0.9, -0.1);
      lid.rotation.x = -0.45;
      for (const x of [-0.5, 0.5]) {
        box(p, gold, 0.1, 0.85, 0.91, x, 0.42, 0);
        box(p, gold, 0.1, 0.2, 0.95, x, 0.91, -0.1);
      }
      box(p, gold, 0.22, 0.25, 0.1, 0, 0.65, 0.5);
      for (let i = 0; i < 12; i++)
        cyl(
          p,
          gold,
          0.1,
          0.1,
          0.045,
          Math.sin(i * 3) * 0.5,
          0.85 + Math.cos(i) * 0.04,
          Math.cos(i * 4) * 0.2,
        );
      this.burst(new T.Vector3(0, 1.1, 0), "#ffe29a", 25);
    } else if (kind === "healing") {
      cyl(p, iron, 0.8, 1, 0.3, 0, 0.15, 0);
      cyl(p, white, 0.2, 0.3, 1, 0, 0.6, 0);
      const bowl = cyl(p, gold, 0.65, 0.3, 0.3, 0, 1.15, 0);
      cyl(
        p,
        new T.MeshBasicMaterial({ color: "#83e8ce" }),
        0.53,
        0.53,
        0.03,
        0,
        1.32,
        0,
      );
      ball(p, new T.MeshBasicMaterial({ color: "#b5f3cf" }), 0.17, 0, 1.7, 0);
      this.burst(new T.Vector3(0, 1.6, 0), "#a8efc1", 20);
    }
  }
  sync(units: Unit[]) {
    for (const side of ["hero", "enemy"] as const) {
      const group = units.filter((u) => u.side === side);
      group.forEach((u, i) => {
        let f = this.figures.get(u.id);
        if (!f) {
          f = character(
            u.look,
            colors[u.element],
            Number(u.defId.replace(/\D/g, "")) || i,
            u.side === "enemy"
              ? (enemies.find((e) => e.id === u.defId)?.region ?? 2)
              : -1,
          );
          const x = side === "hero" ? -2.5 : 2.5,
            z = (i - (group.length - 1) / 2) * 1.48;
          f.root.position.set(x, 0, z);
          f.root.rotation.y =
            side === "hero" ? Math.PI * 0.25 : -Math.PI * 0.17;
          f.home.copy(f.root.position);
          if (u.boss) f.root.scale.multiplyScalar(1.5);
          f.root.userData.id = u.id;
          this.environment.add(f.root);
          this.clickables.push(f.root);
          this.figures.set(u.id, f);
        }
        f.dead = u.hp <= 0;
      });
    }
  }
  showHero(h: HeroDef) {
    this.clear();
    this.mode = "hero";
    this.camTarget.set(4.4, 3.3, 6.8);
    this.target.set(innerWidth < 700 ? -1 : 2.5, innerWidth < 700 ? 0 : 1, 0);
    cyl(this.environment, mat("#465260"), 1.5, 1.7, 0.35, 0, -0.15, 0, 32);
    cyl(this.environment, gold, 1.51, 1.51, 0.04, 0, 0.05, 0, 32);
    const f = character(h.look, colors[h.element], Number(h.id.slice(1)));
    f.root.rotation.y = 0.2;
    this.environment.add(f.root);
    this.figures.set(h.id, f);
    for (const side of [-1, 1]) {
      const rim = new T.PointLight(colors[h.element], 4, 10);
      rim.position.set(side * 3, 3, side * 2);
      this.environment.add(rim);
    }
  }
  project(id: string) {
    const f = this.figures.get(id);
    if (!f) return null;
    const v = f.root.position
      .clone()
      .add(new T.Vector3(0, f.root.scale.y * 2.25, 0))
      .project(this.camera);
    return {
      x: ((v.x + 1) / 2) * innerWidth,
      y: ((-v.y + 1) / 2) * innerHeight,
    };
  }
  burst(pos: T.Vector3, color: string, count = 24) {
    const material = new T.MeshBasicMaterial({ color, transparent: true });
    for (let i = 0; i < count; i++) {
      const p = mesh(
        new T.IcosahedronGeometry(0.045 + Math.random() * 0.06),
        material.clone(),
      );
      p.position.copy(pos);
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        velocity: new T.Vector3(
          (Math.random() - 0.5) * 3,
          1 + Math.random() * 3,
          (Math.random() - 0.5) * 3,
        ),
        life: 0.6 + Math.random() * 0.4,
        max: 1,
      });
    }
  }
  animate(event: CombatEvent, speed = 1) {
    const f = this.figures.get(event.actor);
    const target = this.figures.get(event.targets[0]);
    if (!f) return;
    this.eventAnim = {
      event,
      time: 0,
      duration: 1.0 / speed,
      from: f.home.clone(),
      to: target?.home.clone() ?? f.home.clone(),
    };
    if (
      /mage|archer|druid|priest|necromancer|warlock|plague|firelord|mermaid|lich|sovereign|turret/.test(
        f.look,
      ) &&
      event.type === "attack"
    ) {
      this.eventAnim.projectile = mesh(
        new T.IcosahedronGeometry(0.16, 1),
        new T.MeshBasicMaterial({ color: colors[event.element] }),
      );
      this.scene.add(this.eventAnim.projectile);
    }
    this.burst(
      f.root.position.clone().add(new T.Vector3(0, 1.2, 0)),
      colors[event.element],
      10,
    );
  }
  frame(t: number) {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0.016);
    this.last = t;
    this.time = t / 1000;
    this.camera.position.lerp(this.camTarget, 0.045);
    this.camera.lookAt(this.target);
    this.ring.visible = false;
    for (const [id, f] of this.figures) {
      const turn = this.time * 2 + f.seed;
      f.body.position.y = Math.sin(turn) * 0.035;
      f.head.rotation.z = Math.sin(turn * 0.7) * 0.025;
      f.head.rotation.x = T.MathUtils.lerp(f.head.rotation.x, 0, 0.1);
      f.left.rotation.z = Math.sin(turn) * 0.045;
      f.right.rotation.x = Math.sin(turn) * 0.04;
      if (f.dead) {
        f.root.rotation.z = T.MathUtils.lerp(
          f.root.rotation.z,
          -Math.PI * 0.45,
          0.1,
        );
        f.root.position.y = T.MathUtils.lerp(f.root.position.y, -0.15, 0.1);
        f.root.scale.lerp(new T.Vector3(0.05, 0.05, 0.05), 0.025);
      }
      if (this.mode === "victory" && !f.dead) {
        f.body.position.y = Math.abs(Math.sin(this.time * 5 + f.seed)) * 0.3;
        f.right.rotation.z = -0.6;
      }
      if (this.selected === id && !f.dead) {
        this.ring.visible = true;
        this.ring.position.copy(f.root.position);
        this.ring.position.y = 0.08;
      }
    }
    if (this.eventAnim) {
      const a = this.eventAnim;
      a.time += dt;
      const p = Math.min(1, a.time / a.duration),
        f = this.figures.get(a.event.actor)!;
      const melee =
        !/mage|archer|druid|priest|necromancer|warlock|plague|firelord|mermaid|lich|sovereign|turret/.test(
          f.look,
        ) && a.event.type === "attack";
      this.camera.fov = 38 - Math.sin(p * Math.PI) * 2;
      this.camera.updateProjectionMatrix();
      if (a.projectile) {
        a.projectile.position.lerpVectors(
          a.from.clone().add(new T.Vector3(0, 1.3, 0)),
          a.to.clone().add(new T.Vector3(0, 1.3, 0)),
          Math.min(1, p / 0.45),
        );
        a.projectile.visible = p < 0.48;
      }
      if (melee) {
        const near = a.to
          .clone()
          .sub(a.from)
          .normalize()
          .multiplyScalar(-0.95)
          .add(a.to);
        f.root.position.lerpVectors(a.from, near, Math.sin(p * Math.PI));
      }
      f.right.rotation.x = -Math.sin(p * Math.PI) * 1.8;
      f.body.rotation.z = Math.sin(p * Math.PI * 2) * 0.13;
      if (p > 0.42 && p - dt / a.duration <= 0.42) {
        for (const id of a.event.targets) {
          const target = this.figures.get(id);
          if (target) {
            this.burst(
              target.root.position.clone().add(new T.Vector3(0, 1.2, 0)),
              colors[a.event.element],
              a.event.type === "attack" ? 32 : 18,
            );
            target.head.rotation.x = -0.25;
          }
        }
      }
      if (p >= 1) {
        if (a.projectile) {
          this.scene.remove(a.projectile);
          a.projectile.geometry.dispose();
          (a.projectile.material as T.Material).dispose();
        }
        f.root.position.copy(f.home);
        f.body.rotation.z = 0;
        this.eventAnim = null;
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= dt * 3;
      (p.mesh.material as T.MeshBasicMaterial).opacity = Math.max(0, p.life);
      p.mesh.scale.setScalar(Math.max(0.1, p.life));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as T.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((n) => this.frame(n));
  }
}
