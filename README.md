# Emberfall

A browser-based 3D duel featuring the supplied Claris and Chase characters and the ancient Chinese arena.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` to create a production build in `dist/`.

## Controls

- **W / A / S / D** or **arrow keys** — move; **Shift** — dodge (hold to sprint); **Esc** — pause.
- **J** — rotating sword combo; **K** — heavy strike; **Q** — rotating special.
- **H** — show or hide the on-screen fighter's guide; **Enter** — start the duel.
- Use the on-screen controls on touch screens. The sound button enables synthesized combat effects.

Character colors are restored from the GLBs' embedded textures when their original materials specify black color factors or emissive color textures. The arena loader also translates its older specular/glossiness material extension into compatible Three.js physically based materials.

The fighters start on the measured top surface of the raised, central arena platform. Grounded movement stays within the platform edges, with acceleration, friction, gravity, dodge jumps and airborne hit reactions, and soft contact shadows to keep the characters visually planted. Both fighters cycle through their supplied idle and run clips and a wider range of attack animations.
