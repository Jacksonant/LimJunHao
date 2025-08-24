# 3D Models Directory

To use OBJ/MTL models:

1. Download a human 3D model (OBJ + MTL files)
2. Place them in this directory as:
   - `male02.obj`
   - `male02.mtl` 
   - Any texture files (.jpg, .png)

## Free Model Sources:
- [Mixamo](https://www.mixamo.com/) - Free rigged characters
- [TurboSquid](https://www.turbosquid.com/Search/3D-Models/free/obj/human)
- [Free3D](https://free3d.com/3d-models/obj/human)
- [CGTrader](https://www.cgtrader.com/free-3d-models/character/man/obj)

## Example Structure:
```
/public/models/
├── male02.obj
├── male02.mtl
├── texture.jpg
└── README.md
```

The component will automatically fallback to a simple procedural model if OBJ files are not found.