// Motor de jogo puro (sem gráficos). O ecrã de jogo e o solver usam exatamente este código,
// por isso um nível validado pelo solver joga-se igual no telemóvel.
//
// Modelo:
// - O quadro é uma grelha de células: vazia, bloco, pedra de cera ou flor fechada.
// - Uma célula vazia "exterior" está ligada ao lado de fora do quadro por células vazias.
// - Um bloco é ALCANÇÁVEL se tocar (4 vizinhos) no lado de fora ou numa célula vazia exterior.
// - Cada peça numa ranhura lança abelhas (uma de LAUNCH_INTERVAL_MS em LAUNCH_INTERVAL_MS);
//   cada abelha reserva o bloco alcançável mais perto da colmeia, apanha-o (o bloco sai do
//   quadro) e entrega-o na colmeia (o número da peça desce 1).
// - Tudo é guiado por eventos com tempo exato, por isso o resultado não depende dos fps.
import { Rng } from './rng';
import { charColor, type LevelData } from './types';

export const DEFAULT_SLOTS = 5;
export const MAX_SLOTS = 7;
export const LAUNCH_INTERVAL_MS = 90;
const BEE_BASE_MS = 200;
const BEE_TRAVEL_MS = 650;

export const KIND_EMPTY = 0;
export const KIND_BLOCK = 1;
export const KIND_STONE = 2;
export const KIND_FLOWER = 3;

export interface RPiece {
  id: number;
  color: number;
  total: number;
  /** Blocos ainda por entregar */
  remaining: number;
  /** Abelhas a caminho (blocos reservados mas ainda não entregues) */
  inFlight: number;
  twin: number;
  tubeChild: number;
  tubeParent: number;
  hidden: boolean;
}

export interface Bee {
  id: number;
  slot: number;
  pieceId: number;
  cell: number;
  color: number;
  /** partida da colmeia */
  t0: number;
  /** chegada ao bloco */
  t1: number;
  /** regresso à colmeia */
  t2: number;
}

export type EnterSource = 'tap' | 'tube' | 'tweezers';

export type EngineEvent =
  | { type: 'enter'; pieceId: number; slot: number; source: EnterSource; col: number }
  | { type: 'launch'; bee: Bee }
  | { type: 'pickup'; bee: Bee; cell: number }
  | { type: 'deliver'; bee: Bee; pieceId: number; remaining: number }
  | { type: 'pieceDone'; pieceId: number; slot: number }
  | { type: 'stoneBreak'; cell: number }
  | { type: 'flowerOpen'; cell: number }
  | { type: 'magnet'; color: number; cells: number[] }
  | { type: 'columnRemove'; pieceId: number; col: number }
  | { type: 'pieceUpdate'; pieceId: number }
  | { type: 'shuffle' }
  | { type: 'slotAdded'; slots: number };

export type TapCheck = 'ok' | 'empty' | 'tube' | 'twinNotFront' | 'noSpace';

const EV_LAUNCH = 0;
const EV_PICKUP = 1;
const EV_DELIVER = 2;

interface QEvent {
  t: number;
  seq: number;
  type: number;
  a: number;
}

export class GameEngine {
  readonly w: number;
  readonly h: number;
  readonly size: number;
  readonly colorCount: number;
  /** Tempo do motor em ms (avança mais depressa com a velocidade 2x) */
  time = 0;
  kind: Uint8Array;
  color: Int8Array;
  claimed: Uint8Array;
  ext: Uint8Array;
  /** Para pedras: blocos a recolher até partir (0 = não é pedra) */
  stoneNeed: Int32Array;
  /** Para flores: cor que as abre (-1 = não é flor) */
  flowerLock: Int8Array;
  stones: number[] = [];
  flowers: number[] = [];
  colorRemaining: Int32Array;
  blocksLeft = 0;
  picks = 0;
  /** Distância de cada célula à entrada da colmeia (em células) */
  dist: Float32Array;
  order: Int32Array[];
  orderStart: Int32Array;
  columns: number[][];
  pieces: Map<number, RPiece>;
  slots: number[];
  slotNextLaunch: number[];
  slotLaunchPending: boolean[];
  bees = new Map<number, Bee>();
  rng: Rng;
  /** Se false, não cria eventos para os gráficos (mais rápido para o solver) */
  recording = true;
  out: EngineEvent[] = [];
  private queue: QEvent[] = [];
  private seq = 0;
  private beeSeq = 0;

  constructor(level: LevelData, slots = DEFAULT_SLOTS, clone?: GameEngine) {
    if (clone) {
      // construção por cópia (ver clone())
      this.w = clone.w;
      this.h = clone.h;
      this.size = clone.size;
      this.colorCount = clone.colorCount;
      this.time = clone.time;
      this.kind = clone.kind.slice();
      this.color = clone.color.slice();
      this.claimed = clone.claimed.slice();
      this.ext = clone.ext.slice();
      this.stoneNeed = clone.stoneNeed; // imutável
      this.flowerLock = clone.flowerLock; // imutável
      this.stones = clone.stones.slice();
      this.flowers = clone.flowers.slice();
      this.colorRemaining = clone.colorRemaining.slice();
      this.blocksLeft = clone.blocksLeft;
      this.picks = clone.picks;
      this.dist = clone.dist; // imutável
      this.order = clone.order; // imutável
      this.orderStart = clone.orderStart.slice();
      this.columns = clone.columns.map((c) => c.slice());
      this.pieces = new Map();
      for (const [id, p] of clone.pieces) this.pieces.set(id, { ...p });
      this.slots = clone.slots.slice();
      this.slotNextLaunch = clone.slotNextLaunch.slice();
      this.slotLaunchPending = clone.slotLaunchPending.slice();
      for (const [id, b] of clone.bees) this.bees.set(id, { ...b });
      this.rng = new Rng(1);
      this.rng.state = clone.rng.state;
      this.recording = clone.recording;
      this.queue = clone.queue.map((e) => ({ ...e }));
      this.seq = clone.seq;
      this.beeSeq = clone.beeSeq;
      return;
    }
    const { w, h } = level;
    this.w = w;
    this.h = h;
    this.size = Math.max(w, h);
    this.colorCount = level.colors.length;
    const n = w * h;
    this.kind = new Uint8Array(n);
    this.color = new Int8Array(n).fill(-1);
    this.claimed = new Uint8Array(n);
    this.ext = new Uint8Array(n);
    this.stoneNeed = new Int32Array(n);
    this.flowerLock = new Int8Array(n).fill(-1);
    this.colorRemaining = new Int32Array(this.colorCount);
    this.dist = new Float32Array(n);
    this.rng = new Rng(level.seed ^ 0x5eed);

    if (level.grid.length !== h) throw new Error(`Nível ${level.id}: grelha com ${level.grid.length} linhas, esperado ${h}`);
    for (let y = 0; y < h; y++) {
      const row = level.grid[y];
      if (row.length !== w) throw new Error(`Nível ${level.id}: linha ${y} com ${row.length} colunas, esperado ${w}`);
      for (let x = 0; x < w; x++) {
        const c = charColor(row[x]);
        const i = y * w + x;
        if (c >= this.colorCount) throw new Error(`Nível ${level.id}: cor inválida em ${x},${y}`);
        if (c >= 0) {
          this.kind[i] = KIND_BLOCK;
          this.color[i] = c;
          this.colorRemaining[c]++;
          this.blocksLeft++;
        }
      }
    }
    for (const s of level.stones ?? []) {
      const i = s.y * w + s.x;
      if (this.kind[i] !== KIND_BLOCK) throw new Error(`Nível ${level.id}: pedra numa célula vazia`);
      this.kind[i] = KIND_STONE;
      this.stoneNeed[i] = s.n;
      this.stones.push(i);
    }
    for (const f of level.flowers ?? []) {
      const i = f.y * w + f.x;
      if (this.kind[i] !== KIND_BLOCK) throw new Error(`Nível ${level.id}: flor numa célula inválida`);
      this.kind[i] = KIND_FLOWER;
      this.flowerLock[i] = f.lock;
      this.flowers.push(i);
    }

    // Distâncias à entrada da colmeia (por baixo do quadro, ao centro)
    const hx = (w - 1) / 2;
    const hy = h + 1;
    for (let i = 0; i < n; i++) {
      const x = i % w;
      const y = (i / w) | 0;
      this.dist[i] = Math.hypot(x - hx, y - hy);
    }
    // Ordem de preferência por cor: mais perto da colmeia primeiro
    const lists: number[][] = Array.from({ length: this.colorCount }, () => []);
    for (let i = 0; i < n; i++) if (this.color[i] >= 0) lists[this.color[i]].push(i);
    this.order = lists.map((l) => Int32Array.from(l.sort((a, b) => this.dist[a] - this.dist[b] || a - b)));
    this.orderStart = new Int32Array(this.colorCount);

    // Células vazias ligadas ao exterior
    for (let i = 0; i < n; i++) {
      if (this.kind[i] === KIND_EMPTY && !this.ext[i] && this.onBorder(i)) this.flood(i);
    }

    // Peças
    this.pieces = new Map();
    this.columns = level.columns.map((col) => col.map((p) => p.id));
    for (const col of level.columns) {
      for (const p of col) {
        if (this.pieces.has(p.id)) throw new Error(`Nível ${level.id}: peça repetida ${p.id}`);
        this.pieces.set(p.id, {
          id: p.id,
          color: p.c,
          total: p.n,
          remaining: p.n,
          inFlight: 0,
          twin: p.twin ?? -1,
          tubeChild: p.tube ?? -1,
          tubeParent: -1,
          hidden: !!p.hidden,
        });
      }
    }
    for (const p of this.pieces.values()) {
      if (p.tubeChild >= 0) {
        const child = this.pieces.get(p.tubeChild);
        if (!child) throw new Error(`Nível ${level.id}: tubo para peça inexistente`);
        child.tubeParent = p.id;
      }
    }
    this.slots = new Array(slots).fill(-1);
    this.slotNextLaunch = new Array(slots).fill(0);
    this.slotLaunchPending = new Array(slots).fill(false);
  }

  clone(): GameEngine {
    return new GameEngine(null as unknown as LevelData, 0, this);
  }

  // ---------------------------------------------------------------- consultas

  get capacity(): number {
    return this.slots.length;
  }

  freeSlots(): number {
    let f = 0;
    for (const s of this.slots) if (s < 0) f++;
    return f;
  }

  isQuiescent(): boolean {
    return this.queue.length === 0;
  }

  isWon(): boolean {
    return this.blocksLeft === 0 && this.bees.size === 0;
  }

  /** Sem abelhas a trabalhar, nenhuma ranhura avança e não há nenhum toque possível. */
  isBlocked(): boolean {
    if (!this.isQuiescent() || this.isWon()) return false;
    for (let c = 0; c < this.columns.length; c++) if (this.checkTap(c) === 'ok') return false;
    return true;
  }

  onBorder(i: number): boolean {
    const x = i % this.w;
    const y = (i / this.w) | 0;
    return x === 0 || y === 0 || x === this.w - 1 || y === this.h - 1;
  }

  touchesExterior(i: number): boolean {
    const w = this.w;
    const x = i % w;
    const y = (i / w) | 0;
    if (x === 0 || y === 0 || x === w - 1 || y === this.h - 1) return true;
    return this.ext[i - 1] === 1 || this.ext[i + 1] === 1 || this.ext[i - w] === 1 || this.ext[i + w] === 1;
  }

  isReachable(i: number): boolean {
    return this.kind[i] === KIND_BLOCK && this.claimed[i] === 0 && this.touchesExterior(i);
  }

  /** Bloco alcançável mais perto da colmeia, desta cor (-1 se não houver). */
  findTarget(color: number): number {
    const list = this.order[color];
    let k = this.orderStart[color];
    while (k < list.length && this.kind[list[k]] === KIND_EMPTY) k++;
    this.orderStart[color] = k;
    for (; k < list.length; k++) {
      const i = list[k];
      if (this.kind[i] === KIND_BLOCK && this.claimed[i] === 0 && this.touchesExterior(i)) return i;
    }
    return -1;
  }

  countReachable(color: number): number {
    const list = this.order[color];
    let n = 0;
    for (let k = this.orderStart[color]; k < list.length; k++) if (this.isReachable(list[k])) n++;
    return n;
  }

  /** Blocos ainda a pedir para esta peça (não entregues e sem abelha a caminho). */
  demand(p: RPiece): number {
    return p.remaining - p.inFlight;
  }

  stoneLeft(i: number): number {
    return Math.max(0, this.stoneNeed[i] - this.picks);
  }

  columnOf(pieceId: number): number {
    for (let c = 0; c < this.columns.length; c++) if (this.columns[c].includes(pieceId)) return c;
    return -1;
  }

  slotOf(pieceId: number): number {
    return this.slots.indexOf(pieceId);
  }

  checkTap(col: number): TapCheck {
    const front = this.columns[col]?.[0];
    if (front === undefined) return 'empty';
    const p = this.pieces.get(front)!;
    if (p.tubeParent >= 0) return 'tube';
    const free = this.freeSlots();
    if (p.twin >= 0) {
      if (!this.columns.some((c, i) => i !== col && c[0] === p.twin)) return 'twinNotFront';
      return free >= 2 ? 'ok' : 'noSpace';
    }
    return free >= 1 ? 'ok' : 'noSpace';
  }

  legalTaps(): number[] {
    const res: number[] = [];
    for (let c = 0; c < this.columns.length; c++) {
      if (this.checkTap(c) !== 'ok') continue;
      // Evita duplicar a mesma jogada (as duas gémeas)
      const p = this.pieces.get(this.columns[c][0])!;
      if (p.twin >= 0 && res.some((rc) => this.columns[rc][0] === p.twin)) continue;
      res.push(c);
    }
    return res;
  }

  // ---------------------------------------------------------------- ações

  /** Toca na peça da frente de uma coluna. Devolve false se não for possível. */
  tap(col: number): boolean {
    if (this.checkTap(col) !== 'ok') return false;
    const id = this.columns[col][0];
    const p = this.pieces.get(id)!;
    this.columns[col].shift();
    this.placeInSlot(id, 'tap', col);
    if (p.twin >= 0) {
      const tc = this.columns.findIndex((c) => c[0] === p.twin);
      this.columns[tc].shift();
      this.placeInSlot(p.twin, 'tap', tc);
    }
    this.scheduleLaunches();
    return true;
  }

  /** Reforço "+1 Ranhura" (e "Continuar"). */
  addSlot(): boolean {
    if (this.slots.length >= MAX_SLOTS) return false;
    this.slots.push(-1);
    this.slotNextLaunch.push(this.time);
    this.slotLaunchPending.push(false);
    this.emit({ type: 'slotAdded', slots: this.slots.length });
    return true;
  }

  /** Reforço "Pinça": tira qualquer peça de uma coluna para a bandeja. */
  canTweezers(pieceId: number): boolean {
    const p = this.pieces.get(pieceId);
    if (!p || this.columnOf(pieceId) < 0) return false;
    const need = p.twin >= 0 && this.columnOf(p.twin) >= 0 ? 2 : 1;
    return this.freeSlots() >= need;
  }

  tweezers(pieceId: number): boolean {
    if (!this.canTweezers(pieceId)) return false;
    const ids = [pieceId];
    const p = this.pieces.get(pieceId)!;
    if (p.twin >= 0 && this.columnOf(p.twin) >= 0) ids.push(p.twin);
    for (const id of ids) {
      const q = this.pieces.get(id)!;
      if (q.tubeParent >= 0) {
        // tirar a peça de trás corta o tubo
        this.pieces.get(q.tubeParent)!.tubeChild = -1;
        q.tubeParent = -1;
      }
      const col = this.columnOf(id);
      this.columns[col].splice(this.columns[col].indexOf(id), 1);
      this.placeInSlot(id, 'tweezers', col);
    }
    this.scheduleLaunches();
    return true;
  }

  /** Reforço "Flor-íman": recolhe na hora todos os blocos alcançáveis de uma cor. */
  magnet(color: number): number {
    const cells: number[] = [];
    const list = this.order[color];
    for (let k = this.orderStart[color]; k < list.length; k++) if (this.isReachable(list[k])) cells.push(list[k]);
    if (cells.length === 0) return 0;
    let k = cells.length;
    // Desconta primeiro nas peças da bandeja, depois nas colunas (da frente para trás).
    for (const id of this.slots) {
      if (k === 0) break;
      if (id < 0) continue;
      const p = this.pieces.get(id)!;
      if (p.color !== color) continue;
      const take = Math.min(k, this.demand(p));
      p.remaining -= take;
      k -= take;
      if (take > 0) this.emit({ type: 'pieceUpdate', pieceId: id });
    }
    const maxDepth = Math.max(0, ...this.columns.map((c) => c.length));
    for (let d = 0; d < maxDepth && k > 0; d++) {
      for (const col of this.columns) {
        if (k === 0) break;
        const id = col[d];
        if (id === undefined) continue;
        const p = this.pieces.get(id)!;
        if (p.color !== color) continue;
        const take = Math.min(k, p.remaining);
        p.remaining -= take;
        k -= take;
        if (take > 0) this.emit({ type: 'pieceUpdate', pieceId: id });
      }
    }
    if (k !== 0) throw new Error('Invariante quebrada: blocos sem peça correspondente');
    for (const i of cells) this.removeCell(i);
    this.emit({ type: 'magnet', color, cells });
    // Peças das colunas que chegaram a 0 desaparecem
    for (let c = 0; c < this.columns.length; c++) {
      for (const id of this.columns[c].slice()) {
        const p = this.pieces.get(id)!;
        if (p.remaining > 0) continue;
        this.unlink(p);
        this.columns[c].splice(this.columns[c].indexOf(id), 1);
        this.emit({ type: 'columnRemove', pieceId: id, col: c });
      }
    }
    // Peças da bandeja que chegaram a 0 terminam
    for (let s = 0; s < this.slots.length; s++) {
      const id = this.slots[s];
      if (id < 0) continue;
      const p = this.pieces.get(id)!;
      if (p.remaining === 0 && p.inFlight === 0) this.completePiece(s);
    }
    this.scheduleLaunches();
    return cells.length;
  }

  /** Reforço "Baralhar": troca a ordem das peças livres nas colunas. */
  shuffleColumns(rng: Rng = this.rng): void {
    const positions: [number, number][] = [];
    const ids: number[] = [];
    this.columns.forEach((col, c) =>
      col.forEach((id, d) => {
        const p = this.pieces.get(id)!;
        if (p.twin < 0 && p.tubeChild < 0 && p.tubeParent < 0) {
          positions.push([c, d]);
          ids.push(id);
        }
      }),
    );
    rng.shuffle(ids);
    positions.forEach(([c, d], k) => (this.columns[c][d] = ids[k]));
    this.emit({ type: 'shuffle' });
  }

  // ---------------------------------------------------------------- tempo

  /** Avança o tempo do motor (dt já multiplicado pela velocidade). */
  advance(dt: number): EngineEvent[] {
    const target = this.time + dt;
    while (this.queue.length && this.queue[0].t <= target) this.step();
    this.time = target;
    return this.flush();
  }

  /** Corre até não haver nada a acontecer (todas as abelhas em casa). */
  runToQuiescence(): EngineEvent[] {
    while (this.queue.length) this.step();
    return this.flush();
  }

  flush(): EngineEvent[] {
    const o = this.out;
    this.out = [];
    return o;
  }

  /** Chave do estado (para o solver não repetir estados). Só em calma. */
  stateKey(): string {
    let h1 = 0;
    let h2 = 0;
    for (let i = 0; i < this.kind.length; i++) {
      if (this.kind[i] === KIND_EMPTY) {
        h1 = (Math.imul(h1, 31) + i) | 0;
        h2 = (h2 + Math.imul(i + 7, 2654435761)) | 0;
      }
    }
    const slots = this.slots.map((id) => (id < 0 ? '-' : `${id}:${this.pieces.get(id)!.remaining}`)).join(',');
    return `${h1}.${h2}.${this.blocksLeft}|${slots}|${this.columns.map((c) => c.length).join(',')}`;
  }

  // ---------------------------------------------------------------- interno

  private emit(e: EngineEvent): void {
    if (this.recording) this.out.push(e);
  }

  private placeInSlot(id: number, source: EnterSource, col: number, slot = this.slots.indexOf(-1)): void {
    this.slots[slot] = id;
    this.slotNextLaunch[slot] = this.time;
    const p = this.pieces.get(id)!;
    p.hidden = false;
    this.emit({ type: 'enter', pieceId: id, slot, source, col });
  }

  private unlink(p: RPiece): void {
    if (p.twin >= 0) {
      const t = this.pieces.get(p.twin);
      if (t) t.twin = -1;
      p.twin = -1;
    }
    if (p.tubeParent >= 0) {
      this.pieces.get(p.tubeParent)!.tubeChild = -1;
      p.tubeParent = -1;
    }
    if (p.tubeChild >= 0) {
      this.pieces.get(p.tubeChild)!.tubeParent = -1;
      p.tubeChild = -1;
    }
  }

  private completePiece(slot: number): void {
    const id = this.slots[slot];
    const p = this.pieces.get(id)!;
    this.slots[slot] = -1;
    this.emit({ type: 'pieceDone', pieceId: id, slot });
    if (p.twin >= 0) {
      const t = this.pieces.get(p.twin);
      if (t) t.twin = -1;
    }
    if (p.tubeChild >= 0) {
      const childId = p.tubeChild;
      const child = this.pieces.get(childId)!;
      child.tubeParent = -1;
      p.tubeChild = -1;
      const col = this.columnOf(childId);
      if (col >= 0) {
        this.columns[col].splice(this.columns[col].indexOf(childId), 1);
        this.placeInSlot(childId, 'tube', col, slot);
      }
    }
  }

  private push(t: number, type: number, a: number): void {
    const q = this.queue;
    const e: QEvent = { t, seq: this.seq++, type, a };
    q.push(e);
    let i = q.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (less(q[parent], e)) break;
      q[i] = q[parent];
      i = parent;
    }
    q[i] = e;
  }

  private pop(): QEvent {
    const q = this.queue;
    const top = q[0];
    const last = q.pop()!;
    if (q.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        let best = last;
        if (l < q.length && less(q[l], best)) {
          m = l;
          best = q[l];
        }
        if (r < q.length && less(q[r], best)) m = r;
        if (m === i) break;
        q[i] = q[m];
        i = m;
      }
      q[i] = last;
    }
    return top;
  }

  private step(): void {
    const e = this.pop();
    this.time = Math.max(this.time, e.t);
    if (e.type === EV_LAUNCH) this.onLaunch(e.a);
    else if (e.type === EV_PICKUP) this.onPickup(e.a);
    else this.onDeliver(e.a);
  }

  private flightMs(cell: number): number {
    return Math.round(BEE_BASE_MS + (this.dist[cell] / this.size) * BEE_TRAVEL_MS);
  }

  /** Agenda abelhas para as ranhuras que podem trabalhar. */
  scheduleLaunches(): void {
    for (let s = 0; s < this.slots.length; s++) {
      const id = this.slots[s];
      if (id < 0 || this.slotLaunchPending[s]) continue;
      const p = this.pieces.get(id)!;
      if (this.demand(p) <= 0 || this.findTarget(p.color) < 0) continue;
      this.slotLaunchPending[s] = true;
      this.push(Math.max(this.time, this.slotNextLaunch[s]), EV_LAUNCH, s);
    }
  }

  private onLaunch(s: number): void {
    this.slotLaunchPending[s] = false;
    const id = this.slots[s];
    if (id < 0) return;
    const p = this.pieces.get(id)!;
    if (this.demand(p) <= 0) return;
    const cell = this.findTarget(p.color);
    if (cell < 0) return;
    this.claimed[cell] = 1;
    p.inFlight++;
    const fly = this.flightMs(cell);
    const bee: Bee = {
      id: this.beeSeq++,
      slot: s,
      pieceId: id,
      cell,
      color: p.color,
      t0: this.time,
      t1: this.time + fly,
      t2: this.time + 2 * fly,
    };
    this.bees.set(bee.id, bee);
    this.push(bee.t1, EV_PICKUP, bee.id);
    this.slotNextLaunch[s] = this.time + LAUNCH_INTERVAL_MS;
    this.emit({ type: 'launch', bee });
    if (this.demand(p) > 0 && this.findTarget(p.color) >= 0) {
      this.slotLaunchPending[s] = true;
      this.push(this.slotNextLaunch[s], EV_LAUNCH, s);
    }
  }

  private onPickup(beeId: number): void {
    const bee = this.bees.get(beeId)!;
    this.removeCell(bee.cell);
    this.emit({ type: 'pickup', bee, cell: bee.cell });
    this.push(bee.t2, EV_DELIVER, beeId);
    this.scheduleLaunches();
  }

  private onDeliver(beeId: number): void {
    const bee = this.bees.get(beeId)!;
    this.bees.delete(beeId);
    const p = this.pieces.get(bee.pieceId)!;
    p.remaining--;
    p.inFlight--;
    this.emit({ type: 'deliver', bee, pieceId: p.id, remaining: p.remaining });
    if (p.remaining === 0) {
      const s = this.slots.indexOf(p.id);
      if (s >= 0) this.completePiece(s);
    }
    this.scheduleLaunches();
  }

  /** Tira um bloco do quadro (apanhado por uma abelha ou pelo íman). */
  private removeCell(i: number): void {
    const c = this.color[i];
    this.kind[i] = KIND_EMPTY;
    this.claimed[i] = 0;
    this.colorRemaining[c]--;
    this.blocksLeft--;
    this.picks++;
    if (this.touchesExterior(i)) this.flood(i);
    if (this.stones.length) {
      for (let k = this.stones.length - 1; k >= 0; k--) {
        const si = this.stones[k];
        if (this.picks >= this.stoneNeed[si]) {
          this.kind[si] = KIND_BLOCK;
          this.stones.splice(k, 1);
          this.emit({ type: 'stoneBreak', cell: si });
        }
      }
    }
    if (this.flowers.length && this.colorRemaining[c] === 0) {
      for (let k = this.flowers.length - 1; k >= 0; k--) {
        const fi = this.flowers[k];
        if (this.flowerLock[fi] === c) {
          this.kind[fi] = KIND_BLOCK;
          this.flowers.splice(k, 1);
          this.emit({ type: 'flowerOpen', cell: fi });
        }
      }
    }
  }

  /** Marca como exteriores todas as células vazias ligadas a i. */
  private flood(start: number): void {
    const w = this.w;
    const h = this.h;
    const stack = [start];
    this.ext[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % w;
      const y = (i / w) | 0;
      if (x > 0) this.visit(i - 1, stack);
      if (x < w - 1) this.visit(i + 1, stack);
      if (y > 0) this.visit(i - w, stack);
      if (y < h - 1) this.visit(i + w, stack);
    }
  }

  private visit(j: number, stack: number[]): void {
    if (this.kind[j] === KIND_EMPTY && this.ext[j] === 0) {
      this.ext[j] = 1;
      stack.push(j);
    }
  }
}

function less(a: QEvent, b: QEvent): boolean {
  return a.t < b.t || (a.t === b.t && a.seq < b.seq);
}
