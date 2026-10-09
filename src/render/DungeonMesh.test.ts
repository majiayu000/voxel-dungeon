import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { DungeonMesh } from './DungeonMesh';

describe('DungeonMesh cleanup', () => {
  it('releases retired instance resources while retaining shared textures', () => {
    const texture = new THREE.Texture();
    const disposeTexture = vi.spyOn(texture, 'dispose');
    const group = new THREE.Group();
    const resources = Array.from({ length: 3 }, () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ map: texture });
      const mesh = new THREE.InstancedMesh(geometry, material, 1);
      mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      const onDispose = vi.fn();
      mesh.addEventListener('dispose', onDispose);
      group.add(mesh);
      return {
        onDispose,
        disposeGeometry: vi.spyOn(geometry, 'dispose'),
        disposeMaterial: vi.spyOn(material, 'dispose'),
      };
    });
    const dungeon = Object.assign(Object.create(DungeonMesh.prototype) as DungeonMesh, { group });

    dungeon.dispose();
    dungeon.dispose();

    for (const resource of resources) {
      expect(resource.onDispose).toHaveBeenCalledOnce();
      expect(resource.disposeGeometry).toHaveBeenCalledOnce();
      expect(resource.disposeMaterial).toHaveBeenCalledOnce();
    }
    expect(group.children).toHaveLength(0);
    expect(disposeTexture).not.toHaveBeenCalled();
  });
});
