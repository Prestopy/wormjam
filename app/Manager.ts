import {Agent} from "@/app/Agent";
import {Vec2} from "@/app/Vec2";
import {clamp, getC, getR} from "@/app/utils";

export interface PheromoneMap {
	map: Float32Array | null;
	width: number;
	height: number;
}
export class Manager {
	private static instance: Manager;

	private agents: Agent[] | null = null;

	private pheromoneMap: PheromoneMap = { map: null, width: 500, height: 500 };
	private nextMap: PheromoneMap = { map: null, width: 500, height: 500 };

	private static NUM_AGENTS = 40_000;
	private static DECAY = 0.98;

	private imgData: ImageData | null = null;

	private constructor() {

	}

	public getW() {
		return this.pheromoneMap.width;
	}
	public getH() {
		return this.pheromoneMap.height;
	}

	public getDecay() {
		return Manager.DECAY;
	}
	public setDecay(decay: number) {
		Manager.DECAY = clamp(decay, 0, 1);
	}

	public setSize(width: number, height: number) {
		if (this.pheromoneMap.map !== null) throw new Error("Cannot set size after pheromone map is built");

		this.pheromoneMap.width = width;
		this.pheromoneMap.height = height;
	}

	public resize(newW: number, newH: number) {
		if (this.pheromoneMap.map === null) throw new Error("Cannot resize before pheromone map is built");

		const newMap = new Float32Array(newW * newH);
		for (let r = 0; r < newH; r++) {
			for (let c = 0; c < newW; c++) {
				if (r >= this.pheromoneMap.height) {
					newMap[this.flatIdx(r, c)] = 0;
				} else {
					if (c >= this.pheromoneMap.width) {
						newMap[this.flatIdx(r, c)] = 0;
					} else {
						newMap[this.flatIdx(r, c)] = this.pheromoneMap.map[this.flatIdx(r, c)];
					}
				}
			}
		}

		this.pheromoneMap.map = newMap;
		this.pheromoneMap.width = newW;
		this.pheromoneMap.height = newH;
	}

	public populate(numAgents: number) {
		if (this.agents !== null) {
			if (this.agents.length > numAgents) {
				this.agents = this.agents.slice(0, numAgents);
			} else {
				while (this.agents.length < numAgents) {
					this.agents.push(new Agent(new Vec2(Math.random()*this.pheromoneMap.width, Math.random()*this.pheromoneMap.height)));
				}
			}
		} else {
			this.agents = [];
			for (let i = 0; i < numAgents; i++) {
				this.agents.push(new Agent(new Vec2(Math.random() * this.pheromoneMap.width, Math.random() * this.pheromoneMap.height)));
			}
		}

		Manager.NUM_AGENTS = numAgents;
	}

	public build() {
		if (this.pheromoneMap.map !== null) throw new Error("Cannot build twice");

		this.pheromoneMap.map = new Float32Array(this.getW() * this.getH());
		for (let r = 0; r < this.getH(); r++) {
			for (let c = 0; c < this.getW(); c++) {
				this.pheromoneMap.map[this.flatIdx(r, c)] = 0;
			}
		}

		this.populate(Manager.NUM_AGENTS);
	}

	public populateRegion(x: number, y: number, radius: number) {
		if (this.agents === null) return;

		const w = this.getW();
		const h = this.getH();

		const r_center = Math.floor(y);
		const c_center = Math.floor(x);

		const numToAdd = 1_000;
		for (let i=0; i<numToAdd; i++) {
			const dr = Math.floor(Math.random() * (radius*2+1)) - radius;
			const dc = Math.floor(Math.random() * (radius*2+1)) - radius;

			const r = getR(r_center + dr, h);
			const c = getC(c_center + dc, w);

			const distSq = dr*dr + dc*dc;
			if (distSq <= radius*radius) {
				this.agents.push(new Agent(new Vec2(c + 0.5, r + 0.5)));
			}
		}

		// remove old ones
		this.agents = this.agents.slice(this.agents.length-Manager.NUM_AGENTS);
	}
	public editPheromones(x: number, y: number, radius: number, delta: number) {
		if (this.pheromoneMap.map === null) return;

		const w = this.getW();
		const h = this.getH();

		const r_center = Math.floor(y);
		const c_center = Math.floor(x);

		for (let dr = -radius; dr <= radius; dr++) {
			for (let dc = -radius; dc <= radius; dc++) {
				const r = getR(r_center + dr, h);
				const c = getC(c_center + dc, w);

				const distSq = dr*dr + dc*dc;
				if (distSq <= radius*radius) {
					this.pheromoneMap.map[this.flatIdx(r, c)] = clamp(this.pheromoneMap.map[this.flatIdx(r, c)] + delta, 0, 1);
				}
			}
		}
	}

	public update() {
		if (this.agents === null || this.pheromoneMap.map === null) return;

		for (const agent of this.agents) {
			agent.update(this.pheromoneMap);
		}

		// diffuse
		const w = this.getW();
		const h = this.getH();

		this.nextMap.map = structuredClone(this.pheromoneMap.map);
		for (let r = 0; r < h; r++) {
			const r_up = (r - 1 + h) % h;
			const r_dn = (r + 1) % h;

			const row_curr = r * w;
			const row_up = r_up * w;
			const row_dn = r_dn * w;

			for (let c = 0; c < w; c++) {
				const c_left = (c - 1 + w) % w;
				const c_right = (c + 1) % w;

				// Manual convolution with correct indices
				const sum = (
					this.pheromoneMap.map[row_up + c_left] * 1   + this.pheromoneMap.map[row_up + c] * 2   + this.pheromoneMap.map[row_up + c_right] * 1   +
					this.pheromoneMap.map[row_curr + c_left] * 2 + this.pheromoneMap.map[row_curr + c] * 4 + this.pheromoneMap.map[row_curr + c_right] * 2 +
					this.pheromoneMap.map[row_dn + c_left] * 1   + this.pheromoneMap.map[row_dn + c] * 2   + this.pheromoneMap.map[row_dn + c_right] * 1
				) / 16;

				this.nextMap.map[row_curr + c] = sum * 0.98;
			}
		}
		this.pheromoneMap.map = this.nextMap.map;

		// decay
		if (this.pheromoneMap.map === null) throw new Error("Impossible");

		for (let r = 0; r < this.getH(); r++) {
			for (let c = 0; c < this.getW(); c++) {
				this.pheromoneMap.map[this.flatIdx(r, c)] *= Manager.DECAY;
				if (this.pheromoneMap.map[this.flatIdx(r, c)] < 0.01) this.pheromoneMap.map[this.flatIdx(r, c)] = 0;
			}
		}
	}

	public drawAgents(ctx: CanvasRenderingContext2D) {
		if (this.pheromoneMap.map === null || this.agents === null) return;

		const w = this.getW();
		const h = this.getH();

		if (this.imgData === null) this.imgData = ctx.createImageData(w, h);
		const data = this.imgData.data;

		for (const a of this.agents) {
			const r = Math.floor(a.getPos().y);
			const c = Math.floor(a.getPos().x);

			const index = (Math.floor(r) * w + Math.floor(c))*4;
			data[index  ] = 255; // R
			data[index+1] = 255; // G
			data[index+2] = 255; // B
			data[index+3] = 255; // Alpha
		}
	}

	public drawPheromones(ctx: CanvasRenderingContext2D) {
		if (this.pheromoneMap.map === null) return;

		const w = this.getW();
		const h = this.getH();

		if (this.imgData === null) this.imgData = ctx.createImageData(w, h);
		const data = this.imgData.data;

		for (let r = 0; r < h; r++) {
			for (let c = 0; c < w; c++) {
				const pheromoneLevel = this.pheromoneMap.map[this.flatIdx(r, c)];
				const index = (r * w + c)*4;
				if (pheromoneLevel > 0) {
					data[index  ] = 255;    // R
					data[index+1] = 100;    // G
					data[index+2] = 255;    // B
					data[index+3] = pheromoneLevel*255/2; // Alpha
				}
			}
		}
	}

	public applyDrawing(ctx: CanvasRenderingContext2D) {
		if (!this.imgData) return;

		ctx.putImageData(this.imgData, 0, 0);
		this.imgData = null;
	}

	public static getInstance() {
		if (this.instance == null) {
			this.instance = new Manager();
		}
		return this.instance;
	}

	private flatIdx(r: number, c: number): number {
		return r * this.getW() + c;
	}
}
