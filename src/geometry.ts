import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
/** Batch rigid siblings while preserving animated groups and raycastable building roots. */
export function batchMeshes(parent: T.Group) {
  const groups = new Map<string, T.Mesh[]>();
  for (const child of [...parent.children]) {
    if (
      !(child instanceof T.Mesh) ||
      child.children.length ||
      Array.isArray(child.material)
    )
      continue;
    const m = child.material as T.MeshStandardMaterial;
    const key = [
      m.type,
      m.color?.getHex(),
      m.emissive?.getHex(),
      m.metalness,
      m.roughness,
      m.opacity,
      m.transparent,
      m.side,
    ].join(":");
    const list = groups.get(key) ?? [];
    list.push(child);
    groups.set(key, list);
  }
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const copies = meshes.map((mesh) => {
      mesh.updateMatrix();
      const geometry = mesh.geometry.index
        ? mesh.geometry.toNonIndexed()
        : mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrix);
      return geometry;
    });
    const merged = mergeGeometries(copies, false);
    copies.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new T.Mesh(merged, meshes[0].material);
    mesh.castShadow = meshes.some((m) => m.castShadow);
    mesh.receiveShadow = meshes.some((m) => m.receiveShadow);
    for (const old of meshes) {
      parent.remove(old);
      old.geometry.dispose();
    }
    parent.add(mesh);
  }
}
export function batchEnvironment(root: T.Group, animated: Set<T.Object3D>) {
  for (const child of root.children) {
    if (child instanceof T.Group && !animated.has(child))
      batchEnvironment(child, animated);
  }
  batchMeshes(root);
}
