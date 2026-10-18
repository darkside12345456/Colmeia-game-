// Arranque: carrega imagens/sons opcionais do manifesto e gera o resto por código.
import manifest from '../../assets/manifest.json';
import { app } from '../app';
import { buildTextures } from '../art/textures';
import { BaseScene, L, txt } from '../ui/core';

type Manifest = { images: Record<string, string | null>; sounds: Record<string, string | null> };

export class BootScene extends BaseScene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const m = manifest as unknown as Manifest;
    for (const [key, src] of Object.entries(m.images)) if (src) this.load.image(key, src);
    this.load.on('loaderror', (f: { key: string }) => console.warn('[boot] imagem do manifesto em falta:', f.key));
  }

  override create(): void {
    super.create();
    const label = txt(this, L.W / 2, L.H / 2, '', 40);
    label.setText('...');
    buildTextures(this);
    const sounds = Object.fromEntries(Object.entries((manifest as unknown as Manifest).sounds).filter(([, v]) => !!v)) as Record<string, string>;
    this.input.once('pointerdown', () => void app.audio.loadFiles(sounds));
    this.scene.start('Home');
  }
}
