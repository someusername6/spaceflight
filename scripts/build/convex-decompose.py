#!/usr/bin/env python3
"""
Convex decomposition using CoACD (Collision-Aware Convex Decomposition).

Takes a mesh as JSON input and outputs convex hull decomposition.
Used by bundle-meshes.mjs for structure meshes with holes (like station rings).

Install: pip install coacd numpy

Usage:
  echo '{"positions": [...], "indices": [...]}' | python convex-decompose.py

Output:
  JSON array of convex hulls, each with positions and indices.
"""

import json
import os
import sys
import numpy as np

# Suppress CoACD's verbose logging by redirecting stderr during import
# and run_coacd call
_stderr = sys.stderr
sys.stderr = open(os.devnull, 'w')

try:
    import coacd
except ImportError as e:
    sys.stderr = _stderr
    print(json.dumps({
        "error": f"Missing dependency: {e}. Install with: pip install coacd numpy"
    }))
    sys.exit(1)


def decompose_mesh(positions: list, indices: list) -> list:
    """
    Decompose a mesh into convex parts using CoACD.

    Args:
        positions: Flat array of vertex positions [x,y,z,x,y,z,...]
        indices: Flat array of triangle indices [i,j,k,i,j,k,...]

    Returns:
        List of convex hulls, each as {"positions": [...], "indices": [...]}
    """
    # Convert flat arrays to numpy arrays
    vertices = np.array(positions, dtype=np.float64).reshape(-1, 3)
    faces = np.array(indices, dtype=np.int32).reshape(-1, 3)

    # Create CoACD mesh (not trimesh)
    mesh = coacd.Mesh(vertices=vertices, indices=faces)

    # Run CoACD decomposition
    # threshold: controls concavity tolerance (lower = more parts, more accurate)
    # Default 0.05 is good for most cases
    parts = coacd.run_coacd(mesh, threshold=0.05)

    # Convert each part back to flat arrays
    # Each part is [vertices_array, indices_array]
    result = []
    for part_verts, part_faces in parts:
        part_positions = part_verts.flatten().tolist()
        part_indices = part_faces.flatten().tolist()
        result.append({
            "positions": part_positions,
            "indices": part_indices
        })

    return result


def main():
    # Read JSON input from stdin
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    positions = input_data.get("positions", [])
    indices = input_data.get("indices", [])

    if not positions or not indices:
        print(json.dumps({"error": "Missing positions or indices in input"}))
        sys.exit(1)

    try:
        hulls = decompose_mesh(positions, indices)
        print(json.dumps({"hulls": hulls}))
    except Exception as e:
        print(json.dumps({"error": f"Decomposition failed: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
