import { it, expect, vi } from "vitest";
import * as T from "three";
import { World } from "../src/scene";
function world() {
  const w = Object.create(World.prototype) as World;
  Object.assign(w, {
    scene: new T.Scene(),
    environment: new T.Group(),
    figures: new Map(),
    clickables: [],
    eventAnim: null,
    ring: new T.Mesh(),
    particles: [],
    localLights: 2,
  });
  w.scene.add(w.environment);
  return w;
}
it("scene transitions dispose obsolete geometry and local materials", () => {
  const w = world(),
    geometry = new T.BoxGeometry(),
    material = new T.MeshStandardMaterial();
  const gd = vi.spyOn(geometry, "dispose"),
    md = vi.spyOn(material, "dispose");
  w.environment.add(new T.Mesh(geometry, material));
  w.clear();
  expect(gd).toHaveBeenCalledOnce();
  expect(md).toHaveBeenCalledOnce();
  expect(w.environment.children).toHaveLength(0);
  expect(w.localLights).toBe(0);
});
it("leaving mid-effect releases projectile and particle resources", () => {
  const w = world(),
    g = new T.IcosahedronGeometry(),
    m = new T.MeshBasicMaterial(),
    projectile = new T.Mesh(g, m),
    particle = new T.Mesh(
      new T.IcosahedronGeometry(),
      new T.MeshBasicMaterial(),
    );
  w.scene.add(projectile, particle);
  w.eventAnim = {
    event: {} as any,
    time: 0,
    duration: 1,
    from: new T.Vector3(),
    to: new T.Vector3(),
    projectile,
  };
  w.particles = [
    { mesh: particle, life: 1, max: 1, velocity: new T.Vector3() },
  ];
  const gd = vi.spyOn(g, "dispose"),
    md = vi.spyOn(m, "dispose"),
    pd = vi.spyOn(particle.material, "dispose");
  w.clear();
  expect(gd).toHaveBeenCalledOnce();
  expect(md).toHaveBeenCalledOnce();
  expect(pd).toHaveBeenCalledOnce();
  expect(w.eventAnim).toBeNull();
  expect(w.particles).toHaveLength(0);
  expect(w.scene.children).not.toContain(projectile);
});

it("rigid batching preserves world bounds and raycast selection", async () => {
  const { batchMeshes } = await import("../src/geometry");
  const parent = new T.Group();
  parent.userData.id = "forge";
  const material = new T.MeshStandardMaterial({ color: "#885533" });
  const first = new T.Mesh(new T.BoxGeometry(1, 1, 1), material),
    second = new T.Mesh(new T.BoxGeometry(1, 1, 1), material);
  second.position.x = 2;
  parent.add(first, second);
  parent.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(parent);
  batchMeshes(parent);
  parent.updateMatrixWorld(true);
  expect(parent.children).toHaveLength(1);
  const after = new T.Box3().setFromObject(parent);
  expect(after.min.toArray()).toEqual(bounds.min.toArray());
  expect(after.max.toArray()).toEqual(bounds.max.toArray());
  const ray = new T.Raycaster(new T.Vector3(2, 0, 4), new T.Vector3(0, 0, -1));
  const hit = ray.intersectObject(parent, true);
  expect(hit.length).toBeGreaterThan(0);
  expect(hit[0].object.parent!.userData.id).toBe("forge");
});
